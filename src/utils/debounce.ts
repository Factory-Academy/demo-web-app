/**
 * Creates a debounced version of a function that delays invoking the callback
 * until after the specified delay has elapsed since the last time it was invoked.
 * 
 * @param callback - The function to debounce
 * @param delayMs - The delay in milliseconds
 * @returns A debounced version of the callback
 */
export function debounce<T extends (...args: any[]) => void>(
  callback: T,
  delayMs: number
) {
  let timeoutId: ReturnType<typeof setTimeout> | undefined

  return (...args: Parameters<T>) => {
    if (timeoutId !== undefined) {
      clearTimeout(timeoutId)
    }

    timeoutId = setTimeout(() => {
      callback(...args)
    }, delayMs)
  }
}
