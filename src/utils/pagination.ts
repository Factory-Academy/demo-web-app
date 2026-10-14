/**
 * Pagination helper for cursor-based pagination
 */

export interface PaginationParams {
  cursor?: string
  limit?: number
}

export interface PaginatedResult<T> {
  items: T[]
  nextCursor: string | null
  hasMore: boolean
}

export interface ItemWithId {
  id: string
}

const DEFAULT_LIMIT = 10
const MAX_LIMIT = 100

/**
 * Apply cursor-based pagination to an array of items
 * @param items Array of items with id field
 * @param params Pagination parameters (cursor, limit)
 * @returns Paginated result with items, nextCursor, and hasMore flag
 */
export function paginate<T extends ItemWithId>(
  items: T[],
  params: PaginationParams = {}
): PaginatedResult<T> {
  const { cursor, limit = DEFAULT_LIMIT } = params
  const effectiveLimit = Math.min(Math.max(1, limit), MAX_LIMIT)

  // Find start index based on cursor
  let startIndex = 0
  if (cursor) {
    const cursorIndex = items.findIndex((item) => item.id === cursor)
    if (cursorIndex !== -1) {
      startIndex = cursorIndex + 1
    }
  }

  // Slice items for this page (fetch one extra to determine hasMore)
  const pageItems = items.slice(startIndex, startIndex + effectiveLimit + 1)
  const hasMore = pageItems.length > effectiveLimit
  const resultItems = hasMore ? pageItems.slice(0, effectiveLimit) : pageItems

  // Determine next cursor
  const nextCursor = hasMore && resultItems.length > 0 
    ? resultItems[resultItems.length - 1].id 
    : null

  return {
    items: resultItems,
    nextCursor,
    hasMore,
  }
}
