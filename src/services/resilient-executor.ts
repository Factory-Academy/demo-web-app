import {
  CircuitBreakerSnapshot,
  CircuitState,
  RetryOptions,
  ResilienceOptions,
} from '@/models/resilience'
import { CircuitBreaker } from '@/services/circuit-breaker'
import { retryWithBackoff, withTimeout, DEFAULT_RETRY_OPTIONS } from '@/services/retry'
import { AbortError, CircuitOpenError } from '@/services/resilience-errors'

/**
 * Extended options for constructing a {@link ResilientExecutor}, allowing a
 * pre-built {@link CircuitBreaker} to be injected (useful for sharing one
 * breaker across several operations, or for tests).
 */
export interface ResilientExecutorOptions extends ResilienceOptions {
  breaker?: CircuitBreaker
}

/**
 * Composes retry-with-backoff and a circuit breaker into a single guard for
 * calling unreliable dependencies.
 *
 * The circuit breaker wraps each individual attempt, so every failed try is
 * observed by the breaker. Once the breaker opens, remaining retries fail fast
 * with a {@link CircuitOpenError}, which is never retried. This keeps a burst
 * of retries from hammering a dependency that has already been declared
 * unhealthy.
 *
 * @example
 * const executor = new ResilientExecutor({
 *   retry: { maxRetries: 3, timeoutMs: 5000 },
 *   circuitBreaker: { failureThreshold: 5, resetTimeoutMs: 30000 },
 * })
 *
 * const items = await executor.execute((signal) =>
 *   fetch('/api/items', { signal }).then((r) => r.json()),
 * )
 */
export class ResilientExecutor {
  private readonly breaker: CircuitBreaker
  private readonly retryOptions: Partial<RetryOptions>

  constructor(options: ResilientExecutorOptions = {}) {
    this.breaker = options.breaker ?? new CircuitBreaker(options.circuitBreaker)
    this.retryOptions = options.retry ?? {}
  }

  /**
   * The breaker's current state.
   */
  getState(): CircuitState {
    return this.breaker.getState()
  }

  /**
   * A read-only snapshot of the underlying breaker.
   */
  snapshot(): CircuitBreakerSnapshot {
    return this.breaker.snapshot()
  }

  /**
   * Runs a task through the circuit breaker and retry policy.
   *
   * @param task - The work to perform, given an abort signal for cancellation
   *   (e.g. to pass to `fetch`).
   * @param overrides - Per-call retry overrides merged over the executor's
   *   configured retry options.
   */
  async execute<T>(
    task: (signal: AbortSignal) => Promise<T>,
    overrides: Partial<RetryOptions> = {},
  ): Promise<T> {
    const merged: Partial<RetryOptions> = { ...this.retryOptions, ...overrides }
    const baseShouldRetry = merged.shouldRetry ?? DEFAULT_RETRY_OPTIONS.shouldRetry
    const timeoutMs = merged.timeoutMs ?? DEFAULT_RETRY_OPTIONS.timeoutMs
    const signal = merged.signal

    const shouldRetry: RetryOptions['shouldRetry'] = (error, attempt) => {
      // A tripped breaker will keep rejecting; retrying is pointless and would
      // just churn until the retry budget is spent.
      if (error instanceof CircuitOpenError) return false
      // Cancellation is terminal; the retry loop also short-circuits on it, but
      // guarding here keeps a custom shouldRetry from resurrecting it.
      if (error instanceof AbortError) return false
      return baseShouldRetry(error, attempt)
    }

    // The timeout (and external abort) is applied inside the breaker so that a
    // timed-out attempt is observed as a breaker failure while a cancellation is
    // not. The retry layer's own timeout is disabled (timeoutMs: 0) to avoid
    // double-wrapping; it still receives the signal for pre-attempt and
    // mid-backoff cancellation checks.
    const guardedAttempt = () =>
      this.breaker.execute(() =>
        withTimeout(task, {
          timeoutMs,
          signal,
          setTimeoutFn: merged.setTimeoutFn,
          clearTimeoutFn: merged.clearTimeoutFn,
        }),
      )

    return retryWithBackoff(() => guardedAttempt(), {
      ...merged,
      timeoutMs: 0,
      shouldRetry,
    })
  }
}
