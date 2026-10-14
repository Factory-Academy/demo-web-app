/**
 * Creates a debounced version of a function that delays execution
 * until after the specified delay has passed without being called.
 *
 * @param func - The function to debounce
 * @param delay - The delay in milliseconds (must be non-negative)
 * @throws {Error} If delay is negative
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  if (delay < 0) {
    throw new Error('Debounce delay must be non-negative')
  }

  let timeoutId: NodeJS.Timeout | null = null

  return function (...args: Parameters<T>) {
    if (timeoutId) {
      clearTimeout(timeoutId)
    }

    timeoutId = setTimeout(() => {
      func(...args)
      timeoutId = null
    }, delay)
  }
}
