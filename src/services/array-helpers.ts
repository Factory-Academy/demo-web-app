/**
 * Safely calculates the sum of numeric values in an array.
 * Returns 0 for empty arrays.
 */
export function sum(numbers: number[]): number {
  if (numbers.length === 0) {
    return 0
  }
  return numbers.reduce((acc, val) => acc + val, 0)
}

/**
 * Safely calculates the average of numeric values in an array.
 * Returns 0 for empty arrays.
 */
export function average(numbers: number[]): number {
  if (numbers.length === 0) {
    return 0
  }
  return sum(numbers) / numbers.length
}
