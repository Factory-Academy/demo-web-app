/**
 * Lightweight debounce utility.
 *
 * Returns a debounced version of the provided function that delays its
 * execution until after `wait` milliseconds have elapsed since the last
 * time it was invoked. Useful for rate-limiting event handlers like
 * scroll, resize, or input.
 *
 *   const save = debounce(() => console.log('saved'), 300)
 *   save() // starts timer
 *   save() // restarts timer
 *   // 'saved' logs 300ms after the last call
 */

export type DebouncedFunction<T extends (...args: any[]) => any> = {
  (...args: Parameters<T>): void
  cancel: () => void
}

/**
 * Creates a debounced function that delays invoking `func` until after
 * `wait` milliseconds have elapsed since the last invocation.
 *
 * @param func - The function to debounce
 * @param wait - The number of milliseconds to delay (clamped to 0 if negative)
 * @returns A debounced version of the function with a cancel method
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number,
): DebouncedFunction<T> {
  if (typeof func !== 'function') {
    throw new TypeError('Expected a function')
  }

  const delay = Math.max(0, wait)
  let timeoutId: ReturnType<typeof setTimeout> | undefined

  const debounced = (...args: Parameters<T>): void => {
    if (timeoutId !== undefined) {
      clearTimeout(timeoutId)
    }
    timeoutId = setTimeout(() => {
      func(...args)
    }, delay)
  }

  debounced.cancel = (): void => {
    if (timeoutId !== undefined) {
      clearTimeout(timeoutId)
      timeoutId = undefined
    }
  }

  return debounced
}
