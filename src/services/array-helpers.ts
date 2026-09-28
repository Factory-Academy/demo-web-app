/**
 * Safely calculates the sum of numeric values in an array.
 * Returns 0 for empty arrays or null/undefined input.
 * Filters out non-finite values (NaN, Infinity).
 *
 * @example
 * ```typescript
 * const total = sum([10, 20, Number.NaN, Infinity, 5])
 * // total === 35
 * ```
 */
export function sum(numbers: number[] | null | undefined): number {
  if (!numbers || numbers.length === 0) {
    return 0
  }
  return numbers
    .filter(n => Number.isFinite(n))
    .reduce((acc, val) => acc + val, 0)
}

/**
 * Safely calculates the average of numeric values in an array.
 * Returns 0 for empty arrays or null/undefined input.
 * Filters out non-finite values (NaN, Infinity).
 *
 * @example
 * ```typescript
 * const avg = average([10, 20, Number.NaN, Infinity, 30])
 * // avg === 20
 * ```
 */
export function average(numbers: number[] | null | undefined): number {
  if (!numbers || numbers.length === 0) {
    return 0
  }
  const finiteNumbers = numbers.filter(n => Number.isFinite(n))
  if (finiteNumbers.length === 0) {
    return 0
  }
  return sum(finiteNumbers) / finiteNumbers.length
}
