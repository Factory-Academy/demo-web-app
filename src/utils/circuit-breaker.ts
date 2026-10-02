/**
 * Circuit-breaker utility.
 *
 * Guards a flaky dependency by tracking consecutive failures. After enough
 * failures the breaker "opens" and fails fast for a cool-down window, then
 * allows a single probe ("half-open") to decide whether to close again. The
 * clock is injectable so the cool-down window can be tested without waiting.
 */

/** Lifecycle states of a {@link CircuitBreaker}. */
export type CircuitState = 'closed' | 'open' | 'half-open'

/**
 * Error thrown when a call is rejected because the breaker is open (or already
 * probing in half-open state) rather than because the operation itself failed.
 */
export class CircuitOpenError extends Error {
  constructor(message = 'Circuit breaker is open') {
    super(message)
    this.name = 'CircuitOpenError'
    // Required for `instanceof` to work when compiled to ES5.
    Object.setPrototypeOf(this, CircuitOpenError.prototype)
  }
}

/** Configuration for {@link CircuitBreaker}. All fields are optional. */
export interface CircuitBreakerOptions {
  /** Consecutive failures required to open the circuit. Default 5. */
  failureThreshold?: number
  /** Successful probes required to close from half-open. Default 1. */
  successThreshold?: number
  /** Cool-down before a half-open probe is allowed, in ms. Default 30000. */
  resetTimeoutMs?: number
  /** Decide whether an error counts as a failure. Default: all do. */
  isFailure?: (error: unknown) => boolean
  /** Injectable clock, in milliseconds. Defaults to Date.now. */
  now?: () => number
  /** Invoked whenever the breaker changes state. */
  onStateChange?: (from: CircuitState, to: CircuitState) => void
}

/**
 * A circuit breaker that trips after a configurable number of consecutive
 * failures and recovers through a single half-open probe.
 */
export class CircuitBreaker {
  private readonly failureThreshold: number
  private readonly successThreshold: number
  private readonly resetTimeoutMs: number
  private readonly isFailure: (error: unknown) => boolean
  private readonly now: () => number
  private readonly onStateChange: (from: CircuitState, to: CircuitState) => void

  private currentState: CircuitState = 'closed'
  private failureCount = 0
  private successCount = 0
  private openedAt = 0
  private halfOpenInFlight = false

  constructor(options: CircuitBreakerOptions = {}) {
    this.failureThreshold = options.failureThreshold ?? 5
    this.successThreshold = options.successThreshold ?? 1
    this.resetTimeoutMs = options.resetTimeoutMs ?? 30000
    this.isFailure = options.isFailure ?? (() => true)
    this.now = options.now ?? Date.now
    this.onStateChange = options.onStateChange ?? (() => {})

    if (this.failureThreshold < 1 || this.successThreshold < 1) {
      throw new RangeError('thresholds must be at least 1')
    }
    if (this.resetTimeoutMs < 0) {
      throw new RangeError('resetTimeoutMs must be non-negative')
    }
  }

  /** Current state, accounting for an elapsed cool-down window. */
  get state(): CircuitState {
    if (this.currentState === 'open' && this.coolDownElapsed()) {
      return 'half-open'
    }
    return this.currentState
  }

  /** Number of consecutive failures recorded while closed or half-open. */
  get failures(): number {
    return this.failureCount
  }

  /**
   * Run an operation through the breaker.
   *
   * @param fn - The guarded operation.
   * @returns The operation's resolved value.
   * @throws CircuitOpenError when the breaker is open or already probing.
   * @throws The operation's own error when it fails while allowed to run.
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.currentState === 'open') {
      if (!this.coolDownElapsed()) {
        throw new CircuitOpenError()
      }
      this.transitionTo('half-open')
    }

    // In half-open state only a single probe is permitted at a time; any
    // concurrent callers fail fast until the probe resolves.
    if (this.currentState === 'half-open') {
      if (this.halfOpenInFlight) {
        throw new CircuitOpenError('Circuit breaker is probing')
      }
      this.halfOpenInFlight = true
    }

    try {
      const result = await fn()
      this.onSuccess()
      return result
    } catch (error) {
      this.onError(error)
      throw error
    } finally {
      this.halfOpenInFlight = false
    }
  }

  /** Force the breaker back to a clean closed state. */
  reset(): void {
    this.failureCount = 0
    this.successCount = 0
    this.openedAt = 0
    this.halfOpenInFlight = false
    this.transitionTo('closed')
  }

  private coolDownElapsed(): boolean {
    return this.now() - this.openedAt >= this.resetTimeoutMs
  }

  private onSuccess(): void {
    if (this.currentState === 'half-open') {
      this.successCount++
      if (this.successCount >= this.successThreshold) {
        this.failureCount = 0
        this.successCount = 0
        this.transitionTo('closed')
      }
      return
    }
    this.failureCount = 0
  }

  private onError(error: unknown): void {
    if (!this.isFailure(error)) return

    if (this.currentState === 'half-open') {
      // A failed probe sends the breaker straight back to open.
      this.trip()
      return
    }

    this.failureCount++
    if (this.failureCount >= this.failureThreshold) {
      this.trip()
    }
  }

  private trip(): void {
    this.successCount = 0
    this.openedAt = this.now()
    this.transitionTo('open')
  }

  private transitionTo(next: CircuitState): void {
    if (this.currentState === next) return
    const previous = this.currentState
    this.currentState = next
    this.onStateChange(previous, next)
  }
}
