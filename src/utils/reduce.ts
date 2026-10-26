/**
 * Safely sum values from an array using a selector function.
 * Handles empty arrays by returning 0 instead of throwing an error.
 * @param items Array of items to sum
 * @param selector Function to extract the numeric value from each item
 * @returns Sum of all selected values, or 0 if array is empty
 */
export function sumBy<T>(items: T[], selector: (item: T) => number): number {
  return items.reduce((sum, item) => sum + selector(item), 0)
}
