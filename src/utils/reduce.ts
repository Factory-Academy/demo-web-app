export function safeReduce<T, U>(
  array: T[],
  callback: (accumulator: U, currentValue: T, index: number, array: T[]) => U,
  initialValue: U
): U {
  if (array.length === 0) {
    return initialValue
  }
  return array.reduce(callback, initialValue)
}
