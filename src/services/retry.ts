import { RetryOptions } from '@/models/resilience'
import { RetryExhaustedError, TimeoutError } from '@/services/resilience-errors'

/**
 * Default retry policy: up to 3 retries, starting at 100ms and doubling up to
 * a 2s ceiling, with full jitter and no per-attempt timeout. Every error is
 * treated as retryable unless a custom `shouldRetry` is supplied.
 */
export const DEFAULT_RETRY_OPTIONS: RetryOptions = {
  maxRetries: 3,
  initialDelayMs: 100,
  maxDelayMs: 2000,
  backoffFactor: 2,
  jitter: true,
  timeoutMs: 0,
  shouldRetry: () => true,
}

/**
 * Computes the backoff delay for a given retry, before jitter is optionally
 * applied.
 *
 * @param attempt - The 1-based number of the attempt that just failed.
 * @param options - The resolved retry options.
 * @param random - Random source in `[0, 1)`, used only when jitter is enabled.
 * @returns The delay in milliseconds to wait before the next attempt.
 *
 * @example
 * // initialDelayMs=100, backoffFactor=2, jitter=false
 * computeBackoffDelay(1, opts) // 100
 * computeBackoffDelay(2, opts) // 200
 * computeBackoffDelay(3, opts) // 400
 */
export function computeBackoffDelay(
  attempt: number,
  options: RetryOptions,
  random: () => number = Math.random,
): number {
  const exponential = options.initialDelayMs * Math.pow(options.backoffFactor, attempt - 1)
  const capped = Math.min(exponential, options.maxDelayMs)
  if (!options.jitter) return Math.round(capped)
  // Full jitter: pick uniformly in [0, capped] to de-synchronize callers.
  return Math.round(random() * capped)
}

/**
 * Options for {@link withTimeout}.
 */
export interface TimeoutOptions {
  /** Timeout in milliseconds. A value <= 0 disables the timeout entirely. */
  timeoutMs: number
  /** Optional hook fired when the timeout elapses, before rejection. */
  onTimeout?: () => void
  setTimeoutFn?: typeof setTimeout
  clearTimeoutFn?: typeof clearTimeout
}

/**
 * Runs a task with a timeout. The task receives an {@link AbortSignal} that is
 * aborted when the timeout elapses, so cancellable work (such as `fetch`) can
 * stop promptly instead of leaking.
 *
 * When the timeout fires, the returned promise rejects with a
 * {@link TimeoutError}. When `timeoutMs <= 0`, the task runs without a timer
 * and is still handed a (never-aborted) signal for a uniform call shape.
 *
 * @param task - A function that starts the work and returns its promise.
 * @param options - Timeout configuration.
 *
 * @example
 * const data = await withTimeout(
 *   (signal) => fetch('/api/items', { signal }).then((r) => r.json()),
 *   { timeoutMs: 5000 },
 * )
 */
export async function withTimeout<T>(
  task: (signal: AbortSignal) => Promise<T>,
  options: TimeoutOptions,
): Promise<T> {
  const setTimer = options.setTimeoutFn ?? setTimeout
  const clearTimer = options.clearTimeoutFn ?? clearTimeout

  if (!Number.isFinite(options.timeoutMs) || options.timeoutMs <= 0) {
    const controller = new AbortController()
    return task(controller.signal)
  }

  const controller = new AbortController()
  let timer: ReturnType<typeof setTimeout> | undefined

  const timeoutPromise = new Promise<never>((_resolve, reject) => {
    timer = setTimer(() => {
      // Reject before aborting so the race settles on the TimeoutError. If the
      // task rejects synchronously in response to the abort, that rejection
      // would otherwise win the race and mask the real cause (a timeout).
      options.onTimeout?.()
      reject(new TimeoutError(options.timeoutMs))
      controller.abort()
    }, options.timeoutMs)
  })

  try {
    return await Promise.race([task(controller.signal), timeoutPromise])
  } finally {
    if (timer !== undefined) clearTimer(timer)
  }
}

function defaultSleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Executes a task, retrying failures with exponential backoff and optional
 * jitter and per-attempt timeout.
 *
 * Behavior:
 * - Non-retryable errors (per `shouldRetry`) propagate immediately, unwrapped.
 * - When retries are exhausted, the final error is wrapped in a
 *   {@link RetryExhaustedError} whose `cause` is the last underlying error.
 * - Each attempt receives an {@link AbortSignal}; if `timeoutMs > 0`, the
 *   signal aborts on timeout and the attempt rejects with a
 *   {@link TimeoutError}.
 *
 * @param task - The work to run, given an abort signal for cancellation.
 * @param options - Partial retry options merged over {@link DEFAULT_RETRY_OPTIONS}.
 *
 * @example
 * const items = await retryWithBackoff(
 *   (signal) => fetchItems(signal),
 *   { maxRetries: 5, timeoutMs: 3000, shouldRetry: isRetryable },
 * )
 */
export async function retryWithBackoff<T>(
  task: (signal: AbortSignal) => Promise<T>,
  options: Partial<RetryOptions> = {},
): Promise<T> {
  const opts: RetryOptions = { ...DEFAULT_RETRY_OPTIONS, ...options }
  const sleep = opts.sleep ?? defaultSleep
  const random = opts.random ?? Math.random
  const maxAttempts = Math.max(1, opts.maxRetries + 1)

  let lastError: unknown

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      if (opts.timeoutMs > 0) {
        return await withTimeout(task, {
          timeoutMs: opts.timeoutMs,
          setTimeoutFn: opts.setTimeoutFn,
          clearTimeoutFn: opts.clearTimeoutFn,
        })
      }
      const controller = new AbortController()
      return await task(controller.signal)
    } catch (error) {
      lastError = error
      const isLastAttempt = attempt >= maxAttempts

      // Consult the predicate first: a non-retryable error should surface
      // as-is regardless of how many attempts remain.
      if (!opts.shouldRetry(error, attempt)) {
        throw error
      }

      if (isLastAttempt) {
        throw new RetryExhaustedError(opts.maxRetries, error)
      }

      const delay = computeBackoffDelay(attempt, opts, random)
      opts.onRetry?.(error, attempt, delay)
      await sleep(delay)
    }
  }

  // Defensive: the loop always returns or throws above.
  throw new RetryExhaustedError(opts.maxRetries, lastError)
}
