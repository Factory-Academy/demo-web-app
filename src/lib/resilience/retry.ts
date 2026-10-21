import { BackoffOptions, computeBackoffDelay } from './backoff'
import { RetryExhaustedError } from './errors'
import { withTimeout } from './timeout'

export type SleepFn = (ms: number) => Promise<void>

/** Default sleep backed by `setTimeout`; override in tests to avoid real waits. */
export const defaultSleep: SleepFn = (ms) =>
  new Promise((resolve) => setTimeout(resolve, ms))

export interface RetryOptions {
  /** Maximum number of retries after the initial attempt. `0` means try once. */
  retries: number
  /** Per-attempt timeout. Omit to disable the timeout. */
  timeoutMs?: number
  /** Backoff configuration for the delay between attempts. */
  backoff?: Partial<BackoffOptions>
  /** Predicate deciding whether a given error is worth retrying. */
  shouldRetry?: (error: unknown, attempt: number) => boolean
  /** Called just before sleeping for a retry. */
  onRetry?: (error: unknown, attempt: number, delayMs: number) => void
  /** Called after an attempt succeeds, with the attempt index. */
  onSuccess?: (attempt: number) => void
  /** Called after every failed attempt, including the final one. */
  onError?: (error: unknown, attempt: number) => void
  /** Injectable sleep for deterministic tests. */
  sleep?: SleepFn
}

/**
 * Run `operation`, retrying failed attempts with exponential backoff.
 *
 * Failure semantics:
 *  - A non-retryable error (per `shouldRetry`) is re-thrown as-is so callers
 *    can inspect the original error.
 *  - Once every retry is consumed, a {@link RetryExhaustedError} wrapping the
 *    last error is thrown.
 */
export async function retry<T>(
  operation: (attempt: number) => Promise<T>,
  options: RetryOptions,
): Promise<T> {
  const { retries } = options
  if (!Number.isInteger(retries) || retries < 0) {
    throw new RangeError(`retries must be a non-negative integer, got ${retries}`)
  }

  const sleep = options.sleep ?? defaultSleep
  const shouldRetry = options.shouldRetry ?? (() => true)
  let lastError: unknown

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const result =
        options.timeoutMs != null
          ? await withTimeout(() => operation(attempt), options.timeoutMs)
          : await operation(attempt)
      options.onSuccess?.(attempt)
      return result
    } catch (error) {
      lastError = error
      options.onError?.(error, attempt)

      const isLastAttempt = attempt >= retries
      if (isLastAttempt) break
      if (!shouldRetry(error, attempt)) throw error

      const delayMs = computeBackoffDelay(attempt, options.backoff)
      options.onRetry?.(error, attempt, delayMs)
      await sleep(delayMs)
    }
  }

  throw new RetryExhaustedError(retries + 1, lastError)
}
