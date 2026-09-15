/**
 * Type definitions for the retry-with-backoff and circuit-breaker utilities.
 *
 * These are pure interfaces and type aliases, mirroring the pattern used by
 * `models/feature-flag.ts`. Runtime classes live under `services/`.
 */

/**
 * The three states of a circuit breaker.
 *
 * - `closed`: calls flow through normally and failures are counted.
 * - `open`: calls are rejected immediately without invoking the underlying task.
 * - `half-open`: a limited number of trial calls are allowed to probe recovery.
 */
export type CircuitState = 'closed' | 'open' | 'half-open'

/**
 * A monotonic-enough clock returning milliseconds. Defaults to `Date.now`.
 * Injectable so tests can advance time deterministically.
 */
export type Clock = () => number

/**
 * A sleep function that resolves after the given number of milliseconds.
 * Injectable so tests can resolve delays instantly.
 */
export type SleepFn = (ms: number) => Promise<void>

/**
 * Predicate deciding whether a failed attempt should be retried.
 *
 * @param error - The error thrown by the attempt.
 * @param attempt - The 1-based attempt number that just failed.
 * @returns true if another attempt should be made (subject to `maxRetries`).
 */
export type ShouldRetryFn = (error: unknown, attempt: number) => boolean

/**
 * Options controlling retry-with-exponential-backoff behavior.
 */
export interface RetryOptions {
  /**
   * Maximum number of retries after the initial attempt.
   * `maxRetries: 3` means up to 4 total attempts.
   */
  maxRetries: number

  /**
   * Delay before the first retry, in milliseconds. Subsequent delays grow
   * geometrically by `backoffFactor` up to `maxDelayMs`.
   */
  initialDelayMs: number

  /**
   * Upper bound for a single backoff delay, in milliseconds.
   */
  maxDelayMs: number

  /**
   * Multiplier applied to the delay after each retry (e.g. 2 doubles it).
   */
  backoffFactor: number

  /**
   * When true, applies full jitter: the actual delay is a random value in
   * `[0, computedDelay]`. This spreads out retries from many callers and
   * avoids synchronized retry storms.
   */
  jitter: boolean

  /**
   * Per-attempt timeout in milliseconds. A value <= 0 disables the timeout.
   * When exceeded, the attempt rejects with a {@link TimeoutError} and the
   * attempt's abort signal is triggered.
   */
  timeoutMs: number

  /**
   * Predicate deciding whether a given error is retryable. Defaults to
   * retrying every error.
   */
  shouldRetry: ShouldRetryFn

  /**
   * Optional callback invoked before each backoff sleep.
   *
   * @param error - The error that triggered the retry.
   * @param attempt - The 1-based attempt number that just failed.
   * @param delayMs - The delay that will elapse before the next attempt.
   */
  onRetry?: (error: unknown, attempt: number, delayMs: number) => void

  /**
   * Injectable sleep, defaults to a real `setTimeout`-based delay.
   */
  sleep?: SleepFn

  /**
   * Injectable random source in `[0, 1)`, defaults to `Math.random`.
   * Used only when `jitter` is enabled.
   */
  random?: () => number

  /**
   * Optional external abort signal. When it fires, the whole retry operation is
   * cancelled: any in-flight attempt is aborted, a pending backoff is cut short,
   * and the operation rejects with an `AbortError`. Cancellation is never
   * retried and is not counted as a dependency failure.
   */
  signal?: AbortSignal

  /**
   * Injectable timer functions, primarily for testing the timeout path.
   */
  setTimeoutFn?: typeof setTimeout
  clearTimeoutFn?: typeof clearTimeout
}

/**
 * Options controlling circuit-breaker behavior.
 */
export interface CircuitBreakerOptions {
  /**
   * Number of consecutive failures in the `closed` state that trips the
   * breaker to `open`.
   */
  failureThreshold: number

  /**
   * Number of consecutive successes in the `half-open` state required to
   * return the breaker to `closed`.
   */
  successThreshold: number

  /**
   * How long the breaker stays `open` before allowing a trial call
   * (transition to `half-open`), in milliseconds.
   */
  resetTimeoutMs: number

  /**
   * Maximum number of concurrent trial calls permitted while `half-open`.
   * Additional concurrent callers are rejected with a {@link CircuitOpenError}
   * so a burst of traffic cannot all pile onto a dependency that is only
   * tentatively healthy. Defaults to 1.
   */
  halfOpenMaxProbes?: number

  /**
   * Injectable clock, defaults to `Date.now`.
   */
  now?: Clock

  /**
   * Optional callback fired on every state transition.
   */
  onStateChange?: (from: CircuitState, to: CircuitState) => void
}

/**
 * A read-only view of a circuit breaker's current internal state, useful for
 * metrics, dashboards, and assertions in tests.
 */
export interface CircuitBreakerSnapshot {
  state: CircuitState
  /** Consecutive failures counted in the current `closed` window. */
  failures: number
  /** Consecutive successes counted in the current `half-open` window. */
  successes: number
  /** Clock value when the breaker last opened, or 0 if never opened. */
  openedAt: number
  /** The most recent error observed by the breaker, if any. */
  lastError?: unknown
}

/**
 * Combined options for a {@link ResilientExecutor}, layering a circuit breaker
 * around a retry policy.
 */
export interface ResilienceOptions {
  retry?: Partial<RetryOptions>
  circuitBreaker?: Partial<CircuitBreakerOptions>
}
