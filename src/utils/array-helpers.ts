/**
 * A type-safe reduce helper that safely handles empty arrays.
 * Returns the initial value if the array is empty, preventing
 * "Reduce of empty array with no initial value" runtime errors.
 * 
 * @param array - The array to reduce
 * @param reducer - Function to apply to each element
 * @param initialValue - The initial accumulator value
 * @returns The final accumulated value
 */
export function reduce<T, R>(
  array: T[],
  reducer: (accumulator: R, current: T) => R,
  initialValue: R
): R {
  return array.reduce(reducer, initialValue)
}
