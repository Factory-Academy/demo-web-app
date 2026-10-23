/**
 * Calculate the offset (start index) for a given page in zero-indexed pagination.
 * Uses 1-based page numbers (page 1, 2, 3...) and converts to 0-based array indices.
 *
 * @param pageNumber - The page number (1-indexed)
 * @param itemsPerPage - Number of items per page
 * @returns The offset (start index in 0-based array)
 */
export function calculatePaginationOffset(
  pageNumber: number,
  itemsPerPage: number,
): number {
  return (pageNumber - 1) * itemsPerPage
}
