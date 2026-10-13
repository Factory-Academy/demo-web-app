/**
 * Calculate pagination metadata and array slice indices.
 * 
 * @param totalItems - Total number of items in the collection
 * @param page - Current page number (1-indexed)
 * @param pageSize - Number of items per page
 * @returns Pagination metadata including slice indices and page count
 */
export function getPaginationInfo(
  totalItems: number,
  page: number,
  pageSize: number
) {
  if (totalItems < 0 || page < 1 || pageSize < 1) {
    throw new Error('Invalid pagination parameters')
  }

  const totalPages = Math.ceil(totalItems / pageSize)
  const currentPage = totalPages === 0 ? 0 : Math.min(page, totalPages)
  
  // Calculate zero-indexed start position
  const startIndex = (currentPage - 1) * pageSize
  
  // Calculate end position (exclusive for slice)
  const endIndex = Math.min(startIndex + pageSize, totalItems)
  
  return {
    totalItems,
    totalPages,
    currentPage,
    pageSize,
    startIndex,
    endIndex,
    hasNextPage: currentPage < totalPages,
    hasPreviousPage: currentPage > 1,
  }
}

/**
 * Paginate an array and return the items for the requested page.
 * 
 * @param items - Array of items to paginate
 * @param page - Current page number (1-indexed)
 * @param pageSize - Number of items per page
 * @returns Object containing the page items and pagination metadata
 */
export function paginateArray<T>(
  items: T[],
  page: number,
  pageSize: number
) {
  const info = getPaginationInfo(items.length, page, pageSize)
  const pageItems = items.slice(info.startIndex, info.endIndex)
  
  return {
    items: pageItems,
    ...info,
  }
}
