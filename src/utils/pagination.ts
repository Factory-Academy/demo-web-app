export interface PaginationOptions {
  cursor?: string
  limit?: number
}

export interface PaginatedResult<T> {
  data: T[]
  nextCursor: string | null
  hasMore: boolean
  total: number
}

export interface PaginationConfig {
  defaultLimit: number
  maxLimit: number
}

const DEFAULT_CONFIG: PaginationConfig = {
  defaultLimit: 10,
  maxLimit: 100,
}

/**
 * Paginate an array using cursor-based pagination.
 * The cursor is the ID of the last item from the previous page.
 * 
 * @param items - Array of items to paginate (must have 'id' property)
 * @param options - Pagination options (cursor and limit)
 * @param config - Configuration for default and max limits
 * @returns Paginated result with data, cursor, and metadata
 */
export function paginate<T extends { id: string }>(
  items: T[],
  options: PaginationOptions = {},
  config: PaginationConfig = DEFAULT_CONFIG
): PaginatedResult<T> {
  const { cursor, limit: requestedLimit } = options
  
  // Ensure limit is at least 1 and respect max limit
  const effectiveLimit = requestedLimit ?? config.defaultLimit
  const limit = Math.max(1, Math.min(effectiveLimit, config.maxLimit))

  // Find the starting index based on cursor
  // Treat empty or whitespace-only cursors as no cursor
  let startIndex = 0
  if (cursor && cursor.trim()) {
    const cursorIndex = items.findIndex(item => item.id === cursor)
    if (cursorIndex !== -1) {
      startIndex = cursorIndex + 1
    }
  }

  // Slice the array to get the page
  const data = items.slice(startIndex, startIndex + limit)
  
  // Determine if there are more items
  const hasMore = startIndex + limit < items.length
  
  // Get the next cursor (last item's ID in current page)
  const nextCursor = hasMore && data.length > 0 
    ? data[data.length - 1].id 
    : null

  return {
    data,
    nextCursor,
    hasMore,
    total: items.length,
  }
}

/**
 * Parse pagination parameters from URL query parameters
 * 
 * @param searchParams - URL search parameters
 * @returns Parsed pagination options
 */
export function parsePaginationParams(
  searchParams: URLSearchParams
): PaginationOptions {
  const cursorParam = searchParams.get('cursor')
  const cursor = cursorParam && cursorParam.trim() ? cursorParam : undefined
  
  const limitStr = searchParams.get('limit')
  let limit: number | undefined = undefined
  
  if (limitStr) {
    const parsed = parseInt(limitStr, 10)
    // Only accept positive integers
    if (!isNaN(parsed) && parsed > 0) {
      limit = parsed
    }
  }

  return {
    cursor,
    limit,
  }
}
