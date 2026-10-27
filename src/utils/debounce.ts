/**
 * Creates a debounced version of a function that delays its execution.
 * Multiple calls within the delay period will cancel the previous timeout
 * and restart the delay, ensuring the function only executes once after
 * the specified delay has elapsed since the last invocation.
 *
 * @template T - The function type to debounce
 * @param fn - The function to debounce
 * @param delayMs - The delay in milliseconds before executing the function
 * @returns A debounced version of the function with the same signature
 */
export function debounce<T extends (...args: unknown[]) => void>(fn: T, delayMs: number) {
  let timeoutId: ReturnType<typeof setTimeout> | undefined

  return (...args: Parameters<T>) => {
    if (timeoutId !== undefined) clearTimeout(timeoutId)
    timeoutId = setTimeout(() => fn(...args), delayMs)
  }
}
