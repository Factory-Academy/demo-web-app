/**
 * Error types raised by the resilience utilities.
 *
 * Each constructor calls `Object.setPrototypeOf`. Under the project's `es5`
 * TypeScript target, subclassing the built-in `Error` otherwise breaks the
 * prototype chain, causing `instanceof` checks to fail. The retry policy and
 * HTTP client both rely on `instanceof` to classify errors, so restoring the
 * prototype here is a correctness requirement, not decoration.
 */

/**
 * Thrown when a single attempt exceeds its configured timeout.
 */
export class TimeoutError extends Error {
  readonly timeoutMs: number

  constructor(timeoutMs: number) {
    super(`Operation timed out after ${timeoutMs}ms`)
    this.name = 'TimeoutError'
    this.timeoutMs = timeoutMs
    Object.setPrototypeOf(this, TimeoutError.prototype)
  }
}

/**
 * Thrown when a call is short-circuited because the breaker is `open`.
 */
export class CircuitOpenError extends Error {
  /** Milliseconds remaining until the breaker is eligible for a trial call. */
  readonly remainingMs: number
  /** The failure that most recently tripped the breaker, if known. */
  readonly lastError?: unknown

  constructor(remainingMs: number, lastError?: unknown) {
    super(
      `Circuit breaker is open; retry in ${Math.max(0, Math.ceil(remainingMs))}ms`,
    )
    this.name = 'CircuitOpenError'
    this.remainingMs = remainingMs
    this.lastError = lastError
    Object.setPrototypeOf(this, CircuitOpenError.prototype)
  }
}

/**
 * Thrown when every retry attempt has been exhausted. The originating failure
 * is preserved on {@link RetryExhaustedError.cause}.
 */
export class RetryExhaustedError extends Error {
  /** The number of retries that were attempted after the initial call. */
  readonly retries: number
  /** The last underlying error that caused the final attempt to fail. */
  readonly cause: unknown

  constructor(retries: number, cause: unknown) {
    super(
      `Retries exhausted after ${retries} ${retries === 1 ? 'retry' : 'retries'}: ${describeError(cause)}`,
    )
    this.name = 'RetryExhaustedError'
    this.retries = retries
    this.cause = cause
    Object.setPrototypeOf(this, RetryExhaustedError.prototype)
  }
}

function describeError(error: unknown): string {
  if (error instanceof Error) return error.message
  return String(error)
}
