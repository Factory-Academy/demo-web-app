/**
 * Lightweight debounce helper. Delays function execution until after
 * the specified delay has passed since the last invocation.
 *
 *   const search = debounce((query: string) => api.search(query), 500)
 *   input.addEventListener('input', (e) => search(e.target.value))
 *   search.cancel() // abort pending execution
 */

export interface Debounced<T extends (...args: never[]) => unknown> {
  (...args: Parameters<T>): void
  cancel(): void
}

export function debounce<T extends (...args: never[]) => unknown>(
  fn: T,
  delayMs: number,
): Debounced<T> {
  let timeoutId: ReturnType<typeof setTimeout> | null = null

  const debounced = (...args: Parameters<T>) => {
    if (timeoutId !== null) clearTimeout(timeoutId)
    timeoutId = setTimeout(() => {
      fn(...args)
      timeoutId = null
    }, delayMs)
  }

  debounced.cancel = () => {
    if (timeoutId !== null) {
      clearTimeout(timeoutId)
      timeoutId = null
    }
  }

  return debounced
}
