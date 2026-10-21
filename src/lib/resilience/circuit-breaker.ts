/**
 * A classic three-state circuit breaker.
 *
 *   closed    → requests flow; consecutive failures are counted.
 *   open      → requests are rejected until the cool-down elapses.
 *   half-open → a trial window; a success closes the circuit, a failure
 *               re-opens it immediately.
 *
 * The breaker is intentionally transport-agnostic: it only records the
 * outcome of attempts (`onSuccess` / `onFailure`) and answers whether a new
 * request may proceed (`canRequest`). Composition with retries lives in
 * {@link ../resilient}.
 */

export type CircuitState = 'closed' | 'open' | 'half-open'

export interface CircuitBreakerOptions {
  /** Consecutive failures (while closed) that trip the breaker open. */
  failureThreshold: number
  /** Successes required (while half-open) to fully close the breaker. */
  successThreshold: number
  /** How long the breaker stays open before allowing a trial request. */
  openDurationMs: number
  /** Injectable clock in ms for deterministic tests. Defaults to Date.now. */
  now?: () => number
}

export const DEFAULT_CIRCUIT: CircuitBreakerOptions = {
  failureThreshold: 5,
  successThreshold: 1,
  openDurationMs: 30_000,
}

export class CircuitBreaker {
  private state: CircuitState = 'closed'
  private failureCount = 0
  private successCount = 0
  private openedAt = 0

  private readonly options: Required<Omit<CircuitBreakerOptions, 'now'>>
  private readonly now: () => number

  constructor(options?: Partial<CircuitBreakerOptions>) {
    const merged = { ...DEFAULT_CIRCUIT, ...options }
    if (merged.failureThreshold < 1) {
      throw new RangeError('failureThreshold must be >= 1')
    }
    if (merged.successThreshold < 1) {
      throw new RangeError('successThreshold must be >= 1')
    }
    if (merged.openDurationMs <= 0) {
      throw new RangeError('openDurationMs must be > 0')
    }
    this.options = {
      failureThreshold: merged.failureThreshold,
      successThreshold: merged.successThreshold,
      openDurationMs: merged.openDurationMs,
    }
    this.now = options?.now ?? Date.now
  }

  get currentState(): CircuitState {
    return this.state
  }

  /**
   * Whether a request may proceed right now. Calling this while open may
   * transition the breaker to half-open if the cool-down has elapsed, so it
   * is both a query and the gate that releases trial traffic.
   */
  canRequest(): boolean {
    if (this.state === 'open') {
      if (this.now() - this.openedAt >= this.options.openDurationMs) {
        this.toHalfOpen()
        return true
      }
      return false
    }
    return true
  }

  /** Milliseconds remaining until the open breaker allows a trial request. */
  remainingOpenMs(): number {
    if (this.state !== 'open') return 0
    return Math.max(0, this.options.openDurationMs - (this.now() - this.openedAt))
  }

  onSuccess(): void {
    if (this.state === 'half-open') {
      this.successCount++
      if (this.successCount >= this.options.successThreshold) {
        this.close()
      }
      return
    }
    // A success while closed resets the consecutive-failure streak.
    this.failureCount = 0
  }

  onFailure(): void {
    if (this.state === 'half-open') {
      // Any failure during the trial window re-opens the breaker.
      this.open()
      return
    }
    if (this.state === 'open') {
      return
    }
    this.failureCount++
    if (this.failureCount >= this.options.failureThreshold) {
      this.open()
    }
  }

  /** Force the breaker back to a clean closed state. */
  reset(): void {
    this.close()
  }

  private open(): void {
    this.state = 'open'
    this.openedAt = this.now()
    this.failureCount = 0
    this.successCount = 0
  }

  private close(): void {
    this.state = 'closed'
    this.failureCount = 0
    this.successCount = 0
  }

  private toHalfOpen(): void {
    this.state = 'half-open'
    this.failureCount = 0
    this.successCount = 0
  }
}
