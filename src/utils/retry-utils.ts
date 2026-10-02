/**
 * Retry-with-backoff utilities.
 *
 * Provides exponential backoff with optional jitter, per-attempt timeouts,
 * cancellation, and a configurable predicate for deciding which errors are
 * worth retrying. All timing dependencies are injectable so callers (and
 * tests) can control delay, randomness, and the clock.
 */

/**
 * Error thrown when an operation does not complete within its per-attempt
 * timeout. Treated as retryable by default.
 */
export class TimeoutError extends Error {
  constructor(public readonly timeoutMs: number) {
    super(`Operation timed out after ${timeoutMs}ms`)
    this.name = 'TimeoutError'
    // Required for `instanceof` to work when compiled to ES5.
    Object.setPrototypeOf(this, TimeoutError.prototype)
  }
}

/**
 * Error thrown when a retried operation is cancelled via an AbortSignal.
 */
export class AbortError extends Error {
  constructor(message = 'Operation was aborted') {
    super(message)
    this.name = 'AbortError'
    Object.setPrototypeOf(this, AbortError.prototype)
  }
}

/**
 * Error thrown when every retry attempt has been exhausted. The error that
 * caused the final attempt to fail is preserved on `cause`.
 */
export class RetryError extends Error {
  constructor(
    public readonly attempts: number,
    public readonly cause: unknown
  ) {
    super(`Operation failed after ${attempts} attempt(s)`)
    this.name = 'RetryError'
    Object.setPrototypeOf(this, RetryError.prototype)
  }
}

/**
 * Configuration for {@link retryWithBackoff}. Every field is optional; the
 * documented defaults are applied when a field is omitted.
 */
export interface RetryOptions {
  /** Maximum number of attempts, including the first. Default 3. */
  maxAttempts?: number
  /** Delay before the first retry, in milliseconds. Default 100. */
  initialDelayMs?: number
  /** Upper bound applied to any computed delay. Default 2000. */
  maxDelayMs?: number
  /** Multiplier applied to the delay after each attempt. Default 2. */
  backoffFactor?: number
  /** When true, randomize delays to avoid thundering herds. Default true. */
  jitter?: boolean
  /** Per-attempt timeout in milliseconds. 0 disables timeouts. Default 0. */
  timeoutMs?: number
  /** Decide whether a given error should trigger another attempt. */
  isRetryable?: (error: unknown) => boolean
  /** Invoked before each scheduled retry with the computed delay. */
  onRetry?: (error: unknown, attempt: number, delayMs: number) => void
  /** External cancellation. When aborted, retries stop immediately. */
  signal?: AbortSignal
  /** Injectable sleep used between attempts. Defaults to a timer. */
  sleep?: (ms: number) => Promise<void>
  /** Injectable randomness source for jitter. Defaults to Math.random. */
  random?: () => number
}

type ResolvedOptions = Required<Omit<RetryOptions, 'signal'>> & {
  signal?: AbortSignal
}

const DEFAULTS: ResolvedOptions = {
  maxAttempts: 3,
  initialDelayMs: 100,
  maxDelayMs: 2000,
  backoffFactor: 2,
  jitter: true,
  timeoutMs: 0,
  isRetryable: () => true,
  onRetry: () => {},
  sleep: (ms: number) => new Promise((resolve) => setTimeout(resolve, ms)),
  random: Math.random,
  signal: undefined,
}

function resolveOptions(options: RetryOptions): ResolvedOptions {
  const merged: ResolvedOptions = {
    maxAttempts: options.maxAttempts ?? DEFAULTS.maxAttempts,
    initialDelayMs: options.initialDelayMs ?? DEFAULTS.initialDelayMs,
    maxDelayMs: options.maxDelayMs ?? DEFAULTS.maxDelayMs,
    backoffFactor: options.backoffFactor ?? DEFAULTS.backoffFactor,
    jitter: options.jitter ?? DEFAULTS.jitter,
    timeoutMs: options.timeoutMs ?? DEFAULTS.timeoutMs,
    isRetryable: options.isRetryable ?? DEFAULTS.isRetryable,
    onRetry: options.onRetry ?? DEFAULTS.onRetry,
    sleep: options.sleep ?? DEFAULTS.sleep,
    random: options.random ?? DEFAULTS.random,
    signal: options.signal ?? DEFAULTS.signal,
  }
  if (merged.maxAttempts < 1) {
    throw new RangeError('maxAttempts must be at least 1')
  }
  if (merged.initialDelayMs < 0 || merged.maxDelayMs < 0) {
    throw new RangeError('delays must be non-negative')
  }
  if (merged.backoffFactor < 1) {
    throw new RangeError('backoffFactor must be at least 1')
  }
  return merged
}

/**
 * Compute the delay before a given retry using exponential backoff.
 *
 * @param attempt - Zero-based index of the retry about to be scheduled.
 * @param options - Resolved retry options (delays, factor, jitter).
 * @returns Delay in milliseconds, capped at `maxDelayMs`.
 */
export function computeBackoffDelay(
  attempt: number,
  options: Pick<
    ResolvedOptions,
    'initialDelayMs' | 'maxDelayMs' | 'backoffFactor' | 'jitter' | 'random'
  >
): number {
  const exponential =
    options.initialDelayMs * Math.pow(options.backoffFactor, attempt)
  const capped = Math.min(options.maxDelayMs, exponential)

  if (!options.jitter) return capped

  // Equal jitter: keep half the delay fixed and randomize the other half so
  // retries stay spread out but never collapse to zero.
  return capped / 2 + options.random() * (capped / 2)
}

/**
 * Race a promise against a timeout. Rejects with {@link TimeoutError} if the
 * timeout elapses first. The underlying operation is not cancelled; callers
 * that need true cancellation should wire an AbortSignal into their function.
 *
 * @param promise - The in-flight operation.
 * @param timeoutMs - Timeout in milliseconds. Values <= 0 disable the timeout.
 * @param sleep - Injectable timer used to schedule the timeout.
 */
export function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  sleep: (ms: number) => Promise<void> = DEFAULTS.sleep
): Promise<T> {
  if (timeoutMs <= 0) return promise

  return new Promise<T>((resolve, reject) => {
    let settled = false

    // Register the operation's handlers first so that an already-settled
    // operation wins the race against an immediately-resolving timer.
    promise.then(
      (value) => {
        if (!settled) {
          settled = true
          resolve(value)
        }
      },
      (error) => {
        if (!settled) {
          settled = true
          reject(error)
        }
      }
    )

    sleep(timeoutMs).then(() => {
      if (!settled) {
        settled = true
        reject(new TimeoutError(timeoutMs))
      }
    })
  })
}

function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) {
    throw new AbortError()
  }
}

/**
 * Execute an async function, retrying on failure with exponential backoff.
 *
 * The function receives the zero-based attempt number so it can vary behavior
 * across retries. Errors deemed non-retryable by `isRetryable` are rethrown
 * immediately. When all attempts fail the last error is wrapped in a
 * {@link RetryError}.
 *
 * @param fn - Operation to run; may return a value or throw/reject.
 * @param options - Retry configuration. See {@link RetryOptions}.
 * @returns The resolved value of the first successful attempt.
 * @throws AbortError if the signal is aborted before completion.
 * @throws RetryError if every attempt fails with a retryable error.
 */
export async function retryWithBackoff<T>(
  fn: (attempt: number) => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = resolveOptions(options)
  let lastError: unknown
  let attemptsMade = 0

  for (let attempt = 0; attempt < opts.maxAttempts; attempt++) {
    throwIfAborted(opts.signal)
    attemptsMade = attempt + 1

    try {
      return await withTimeout(fn(attempt), opts.timeoutMs, opts.sleep)
    } catch (error) {
      lastError = error

      // A non-retryable failure surfaces unchanged so callers can distinguish
      // "rejected outright" from "gave up after exhausting retries".
      if (!opts.isRetryable(error)) {
        throw error
      }

      const isLastAttempt = attempt === opts.maxAttempts - 1
      if (isLastAttempt) break

      const delayMs = computeBackoffDelay(attempt, opts)
      opts.onRetry(error, attempt + 1, delayMs)
      await opts.sleep(delayMs)
    }
  }

  throw new RetryError(attemptsMade, lastError)
}
