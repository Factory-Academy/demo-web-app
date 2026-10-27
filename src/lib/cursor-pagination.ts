/**
 * Cursor-based pagination parameters for efficient traversal of large datasets.
 */
export interface CursorPaginationParams {
  /** Opaque cursor string pointing to the start position. */
  cursor?: string
  /** Maximum number of items to return. */
  limit: number
}

/**
 * Result envelope for cursor-paginated responses.
 */
export interface CursorPaginatedResponse<T> {
  /** The items in the current page. */
  items: T[]
  /** Cursor for fetching the next page, or null if no more pages. */
  nextCursor: string | null
  /** Whether there are more items beyond this page. */
  hasMore: boolean
}

/**
 * Build query string parameters for cursor pagination.
 * 
 * @param params - Cursor and limit for pagination
 * @returns URLSearchParams ready to append to a request URL
 */
export function buildCursorQueryParams(
  params: CursorPaginationParams,
): URLSearchParams {
  const searchParams = new URLSearchParams()
  
  if (params.cursor) {
    searchParams.set('cursor', params.cursor)
  }
  
  searchParams.set('limit', params.limit.toString())
  
  return searchParams
}

/**
 * Validate cursor pagination parameters.
 * Throws if limit is non-positive or exceeds the maximum allowed.
 * 
 * @param params - Cursor and limit to validate
 * @param maxLimit - Maximum allowed limit (defaults to 100)
 * @throws Error if validation fails
 */
export function validateCursorParams(
  params: CursorPaginationParams,
  maxLimit = 100,
): void {
  if (params.limit <= 0) {
    throw new Error('Limit must be greater than 0')
  }
  
  if (params.limit > maxLimit) {
    throw new Error(`Limit must not exceed ${maxLimit}`)
  }
}

/**
 * Create a paginated response envelope from items and metadata.
 * 
 * @param items - The items for the current page
 * @param nextCursor - Cursor for the next page, or null if last page
 * @returns A properly typed paginated response
 */
export function createCursorResponse<T>(
  items: T[],
  nextCursor: string | null,
): CursorPaginatedResponse<T> {
  return {
    items,
    nextCursor,
    hasMore: nextCursor !== null,
  }
}
