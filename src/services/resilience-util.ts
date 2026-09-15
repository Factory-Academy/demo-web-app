import { SleepFn } from '@/models/resilience'
import { AbortError } from '@/services/resilience-errors'

/**
 * Small internal helpers shared by the retry policy and circuit breaker.
 */

/**
 * Invokes an optional user-supplied callback, swallowing any exception it
 * throws.
 *
 * Hooks such as `onRetry` and `onStateChange` are observability shims. A bug in
 * one of them must never break the resilience machinery around it, so their
 * failures are contained here rather than propagated into control flow.
 */
export function safeInvoke(fn: (() => void) | undefined): void {
  if (!fn) return
  try {
    fn()
  } catch {
    // Intentionally ignored: a faulty hook must not derail retry/breaker logic.
  }
}

/**
 * Sleeps for `ms` milliseconds, but rejects early with an {@link AbortError} if
 * the supplied signal is (or becomes) aborted.
 *
 * When no signal is given this is just `sleep(ms)`, so the fast, injectable
 * test path is preserved. When a signal is given, an abort during the backoff
 * window stops the wait immediately instead of letting a doomed retry proceed.
 */
export function abortableSleep(
  ms: number,
  sleep: SleepFn,
  signal?: AbortSignal,
): Promise<void> {
  if (!signal) return sleep(ms)
  if (signal.aborted) return Promise.reject(new AbortError())

  return new Promise<void>((resolve, reject) => {
    let settled = false

    const onAbort = () => {
      if (settled) return
      settled = true
      reject(new AbortError())
    }

    signal.addEventListener('abort', onAbort, { once: true })

    Promise.resolve(sleep(ms)).then(
      () => {
        if (settled) return
        settled = true
        signal.removeEventListener('abort', onAbort)
        resolve()
      },
      (error) => {
        if (settled) return
        settled = true
        signal.removeEventListener('abort', onAbort)
        reject(error)
      },
    )
  })
}
