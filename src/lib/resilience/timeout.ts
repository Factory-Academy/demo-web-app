import { TimeoutError } from './errors'

/**
 * Race an async operation against a timeout.
 *
 * Resolves with the operation's value if it settles first; rejects with a
 * {@link TimeoutError} if the timer fires first. The timer is always cleared
 * so a long-running operation cannot leak a pending timeout.
 *
 * Note: this does not cancel the underlying work — JavaScript promises are
 * not cancellable. Pass an `AbortSignal` to the operation itself (e.g. to
 * `fetch`) when you also need to abort in-flight I/O.
 */
export function withTimeout<T>(
  operation: () => Promise<T>,
  timeoutMs: number,
): Promise<T> {
  if (!(timeoutMs > 0)) {
    throw new RangeError(`timeoutMs must be > 0, got ${timeoutMs}`)
  }

  return new Promise<T>((resolve, reject) => {
    let settled = false

    const timer = setTimeout(() => {
      if (settled) return
      settled = true
      reject(new TimeoutError(timeoutMs))
    }, timeoutMs)

    // `Promise.resolve().then(operation)` guards against a synchronous throw
    // inside `operation` escaping the race.
    Promise.resolve()
      .then(operation)
      .then(
        (value) => {
          if (settled) return
          settled = true
          clearTimeout(timer)
          resolve(value)
        },
        (error) => {
          if (settled) return
          settled = true
          clearTimeout(timer)
          reject(error)
        },
      )
  })
}
