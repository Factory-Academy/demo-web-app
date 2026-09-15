import {
  CircuitBreakerOptions,
  CircuitBreakerSnapshot,
  CircuitState,
  Clock,
} from '@/models/resilience'
import { CircuitOpenError } from '@/services/resilience-errors'

/**
 * Default breaker policy: trip after 5 consecutive failures, require 2
 * consecutive successes to recover, and wait 30s before probing.
 */
export const DEFAULT_CIRCUIT_BREAKER_OPTIONS: CircuitBreakerOptions = {
  failureThreshold: 5,
  successThreshold: 2,
  resetTimeoutMs: 30000,
}

/**
 * A circuit breaker that protects a flaky dependency from repeated calls once
 * it starts failing, giving it room to recover.
 *
 * State machine:
 * - `closed`: calls pass through. Consecutive failures are counted; reaching
 *   `failureThreshold` trips the breaker to `open`.
 * - `open`: calls are rejected immediately with a {@link CircuitOpenError}.
 *   After `resetTimeoutMs`, the next call transitions the breaker to
 *   `half-open`.
 * - `half-open`: a single probe call is allowed. Success advances toward
 *   recovery (`successThreshold` consecutive successes return it to `closed`);
 *   any failure sends it back to `open`.
 *
 * @example
 * const breaker = new CircuitBreaker({ failureThreshold: 3, resetTimeoutMs: 10000 })
 * const data = await breaker.execute(() => fetchItems())
 */
export class CircuitBreaker {
  private readonly options: CircuitBreakerOptions
  private readonly now: Clock

  private state: CircuitState = 'closed'
  private failureCount = 0
  private successCount = 0
  private openedAt = 0
  private lastError: unknown = undefined

  constructor(options: Partial<CircuitBreakerOptions> = {}) {
    this.options = { ...DEFAULT_CIRCUIT_BREAKER_OPTIONS, ...options }
    this.now = this.options.now ?? Date.now
  }

  /**
   * Returns the current state, first applying any pending `open` -> `half-open`
   * transition based on the elapsed reset timeout.
   */
  getState(): CircuitState {
    this.maybeHalfOpen()
    return this.state
  }

  /**
   * Returns a read-only snapshot of the breaker's internals.
   */
  snapshot(): CircuitBreakerSnapshot {
    this.maybeHalfOpen()
    return {
      state: this.state,
      failures: this.failureCount,
      successes: this.successCount,
      openedAt: this.openedAt,
      lastError: this.lastError,
    }
  }

  /**
   * Runs a task through the breaker.
   *
   * @throws {CircuitOpenError} If the breaker is `open` (task is not invoked).
   * @throws The task's own error if it rejects (also recorded as a failure).
   */
  async execute<T>(task: () => Promise<T>): Promise<T> {
    this.maybeHalfOpen()

    if (this.state === 'open') {
      throw new CircuitOpenError(this.remainingOpenMs(), this.lastError)
    }

    try {
      const result = await task()
      this.onSuccess()
      return result
    } catch (error) {
      this.onFailure(error)
      throw error
    }
  }

  /**
   * Forces the breaker back to a clean `closed` state, clearing all counters.
   */
  reset(): void {
    this.transitionTo('closed')
    this.failureCount = 0
    this.successCount = 0
    this.openedAt = 0
    this.lastError = undefined
  }

  private onSuccess(): void {
    if (this.state === 'half-open') {
      this.successCount++
      if (this.successCount >= this.options.successThreshold) {
        this.transitionTo('closed')
      }
      return
    }
    // A success in the closed state clears any partial failure streak.
    this.failureCount = 0
  }

  private onFailure(error: unknown): void {
    this.lastError = error

    if (this.state === 'half-open') {
      // A failed probe means the dependency is still unhealthy.
      this.transitionTo('open')
      return
    }

    this.failureCount++
    if (this.failureCount >= this.options.failureThreshold) {
      this.transitionTo('open')
    }
  }

  private maybeHalfOpen(): void {
    if (
      this.state === 'open' &&
      this.now() - this.openedAt >= this.options.resetTimeoutMs
    ) {
      this.transitionTo('half-open')
    }
  }

  private remainingOpenMs(): number {
    return this.openedAt + this.options.resetTimeoutMs - this.now()
  }

  private transitionTo(next: CircuitState): void {
    if (this.state === next) return

    const previous = this.state
    this.state = next

    if (next === 'open') {
      this.openedAt = this.now()
      this.successCount = 0
    } else if (next === 'half-open') {
      this.successCount = 0
    } else if (next === 'closed') {
      this.failureCount = 0
      this.successCount = 0
    }

    this.options.onStateChange?.(previous, next)
  }
}
