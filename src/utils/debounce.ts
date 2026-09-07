/**
 * Delays execution of a function until after `wait` milliseconds have elapsed
 * since the last time the debounced function was called.
 *
 * Useful for throttling expensive operations triggered by frequent events,
 * like search input or window resize handlers.
 *
 *   const debouncedSearch = debounce((query: string) => fetchResults(query), 300)
 *   input.addEventListener('input', (e) => debouncedSearch(e.target.value))
 */
export function debounce<Args extends unknown[]>(
  fn: (...args: Args) => void,
  wait: number,
): (...args: Args) => void {
  let timeout: NodeJS.Timeout | null = null

  return (...args: Args) => {
    if (timeout !== null) clearTimeout(timeout)
    timeout = setTimeout(() => {
      fn(...args)
      timeout = null
    }, wait)
  }
}
