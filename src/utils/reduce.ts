/**
 * Safely reduces an array with edge-case handling for null/undefined inputs
 * @param array - The array to reduce (validates it's an array)
 * @param callback - The reducer function
 * @param initialValue - The initial accumulator value
 * @returns The final accumulated value, or initialValue if array is falsy or empty
 */
export function safeReduce<T, U>(
  array: T[] | null | undefined,
  callback: (accumulator: U, currentValue: T, index: number, array: T[]) => U,
  initialValue: U
): U {
  // Edge case: array is null or undefined
  if (!array) {
    return initialValue
  }

  // Edge case: array is empty
  if (array.length === 0) {
    return initialValue
  }

  return array.reduce(callback, initialValue)
}
