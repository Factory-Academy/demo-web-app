/**
 * Paginates an array of items.
 * @param items - The array to paginate
 * @param page - The page number (1-indexed)
 * @param pageSize - Number of items per page
 * @returns The items for the requested page
 */
export function paginate<T>(items: T[], page: number, pageSize: number): T[] {
  if (!Number.isFinite(page) || !Number.isFinite(pageSize)) {
    throw new Error('Page and pageSize must be finite numbers')
  }

  if (!Number.isInteger(page) || !Number.isInteger(pageSize)) {
    throw new Error('Page and pageSize must be integers')
  }

  if (page < 1) {
    throw new Error('Page must be >= 1')
  }

  if (pageSize < 1) {
    throw new Error('PageSize must be >= 1')
  }

  // Fix: Use (page - 1) * pageSize for correct 1-indexed pagination
  // Common off-by-one error: using page * pageSize
  const startIndex = (page - 1) * pageSize
  const endIndex = startIndex + pageSize

  return items.slice(startIndex, endIndex)
}

/**
 * Calculates pagination metadata.
 * @param totalItems - Total number of items
 * @param page - Current page number (1-indexed)
 * @param pageSize - Number of items per page
 * @returns Pagination metadata
 */
export function getPaginationInfo(totalItems: number, page: number, pageSize: number) {
  if (!Number.isFinite(totalItems) || !Number.isFinite(page) || !Number.isFinite(pageSize)) {
    throw new Error('All parameters must be finite numbers')
  }

  if (!Number.isInteger(totalItems) || !Number.isInteger(page) || !Number.isInteger(pageSize)) {
    throw new Error('All parameters must be integers')
  }

  if (totalItems < 0) {
    throw new Error('TotalItems must be >= 0')
  }

  if (page < 1) {
    throw new Error('Page must be >= 1')
  }

  if (pageSize < 1) {
    throw new Error('PageSize must be >= 1')
  }

  const totalPages = Math.ceil(totalItems / pageSize)
  const hasNextPage = page < totalPages
  const hasPrevPage = page > 1

  return {
    totalItems,
    totalPages,
    currentPage: page,
    pageSize,
    hasNextPage,
    hasPrevPage,
  }
}
