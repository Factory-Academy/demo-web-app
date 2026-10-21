/**
 * Error hierarchy for the resilience utilities. All resilience-specific
 * failures extend {@link ResilienceError} so callers can catch the whole
 * family with a single `instanceof` check.
 */

// The explicit `setPrototypeOf` calls are required because the project
// compiles to ES5 (see tsconfig `target`), where subclassing the built-in
// `Error` otherwise breaks `instanceof` for the subclass.

export class ResilienceError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ResilienceError'
    Object.setPrototypeOf(this, ResilienceError.prototype)
  }
}

/** Thrown when a single attempt exceeds its allotted time budget. */
export class TimeoutError extends ResilienceError {
  constructor(public readonly timeoutMs: number) {
    super(`Operation timed out after ${timeoutMs}ms`)
    this.name = 'TimeoutError'
    Object.setPrototypeOf(this, TimeoutError.prototype)
  }
}

/** Thrown up front when the circuit breaker is open and rejecting traffic. */
export class CircuitOpenError extends ResilienceError {
  constructor(public readonly retryAfterMs: number) {
    super(`Circuit is open; retry after ${retryAfterMs}ms`)
    this.name = 'CircuitOpenError'
    Object.setPrototypeOf(this, CircuitOpenError.prototype)
  }
}

/** Thrown when every retry attempt has been consumed without success. */
export class RetryExhaustedError extends ResilienceError {
  constructor(
    public readonly attempts: number,
    public readonly lastError?: unknown,
  ) {
    super(`Retry exhausted after ${attempts} attempt(s)`)
    this.name = 'RetryExhaustedError'
    Object.setPrototypeOf(this, RetryExhaustedError.prototype)
  }
}
