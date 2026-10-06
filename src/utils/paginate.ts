/**
 * Paginate an array into a subset of items.
 *
 * @param array - The array to paginate
 * @param page - Page number (1-indexed)
 * @param pageSize - Number of items per page
 * @returns The paginated subset of the array
 */
export function paginateArray<T>(
  array: T[],
  page: number,
  pageSize: number
): T[] {
  const startIndex = (page - 1) * pageSize
  const endIndex = startIndex + pageSize
  return array.slice(startIndex, endIndex)
}
