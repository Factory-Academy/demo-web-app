/**
 * Debounces a function, delaying its execution until after the specified
 * delay has elapsed without any additional calls.
 *
 * Each call to the debounced function resets the timer. Useful for handling
 * high-frequency events like input changes or window resizes.
 *
 * @param fn The function to debounce.
 * @param delayMs The delay in milliseconds.
 * @returns A debounced function that accepts the same arguments as the original.
 *
 * @example
 * const debouncedSearch = debounce((query: string) => {
 *   fetch(`/api/search?q=${query}`)
 * }, 300)
 *
 * input.addEventListener('input', (e) => debouncedSearch(e.target.value))
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delayMs: number,
): (...args: Parameters<T>) => void {
  if (!Number.isFinite(delayMs) || delayMs < 0) {
    throw new RangeError('delayMs must be a non-negative finite number')
  }

  let timeoutId: ReturnType<typeof setTimeout> | null = null

  return (...args: Parameters<T>) => {
    if (timeoutId !== null) {
      clearTimeout(timeoutId)
    }
    timeoutId = setTimeout(() => {
      fn(...args)
      timeoutId = null
    }, delayMs)
  }
}
