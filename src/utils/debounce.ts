/**
 * Debounces a function by delaying its execution until after a specified delay
 * has elapsed since the last time it was invoked. Useful for rate-limiting
 * expensive operations like API calls or DOM updates.
 *
 * @param fn - The function to debounce
 * @param delayMs - The delay in milliseconds
 * @returns A debounced version of the function
 *
 * @example
 * ```typescript
 * // Debounce a search handler to avoid excessive API calls
 * const handleSearch = (query: string) => {
 *   fetchSearchResults(query);
 * };
 *
 * const debouncedSearch = debounce(handleSearch, 300);
 *
 * // Only the last call within 300ms window will execute
 * debouncedSearch('a');
 * debouncedSearch('ab');
 * debouncedSearch('abc'); // Only this call fires after 300ms
 * ```
 */
export function debounce<T extends (...args: unknown[]) => void>(fn: T, delayMs: number) {
  if (delayMs < 0) {
    throw new Error('Delay must be non-negative')
  }

  let timeoutId: ReturnType<typeof setTimeout> | undefined

  return (...args: Parameters<T>) => {
    if (timeoutId !== undefined) clearTimeout(timeoutId)
    timeoutId = setTimeout(() => fn(...args), delayMs)
  }
}
