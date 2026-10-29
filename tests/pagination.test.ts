import { paginate, parsePaginationParams } from '../src/utils/pagination'

describe('pagination', () => {
  const mockItems = [
    { id: '1', name: 'Item 1' },
    { id: '2', name: 'Item 2' },
    { id: '3', name: 'Item 3' },
    { id: '4', name: 'Item 4' },
    { id: '5', name: 'Item 5' },
  ]

  describe('paginate', () => {
    test('returns first page with default limit', () => {
      const result = paginate(mockItems, {})
      expect(result.data).toHaveLength(5)
      expect(result.hasMore).toBe(false)
      expect(result.nextCursor).toBe(null)
      expect(result.total).toBe(5)
    })

    test('returns first page with custom limit', () => {
      const result = paginate(mockItems, { limit: 2 })
      expect(result.data).toHaveLength(2)
      expect(result.data[0].id).toBe('1')
      expect(result.data[1].id).toBe('2')
      expect(result.hasMore).toBe(true)
      expect(result.nextCursor).toBe('2')
      expect(result.total).toBe(5)
    })

    test('returns second page using cursor', () => {
      const result = paginate(mockItems, { cursor: '2', limit: 2 })
      expect(result.data).toHaveLength(2)
      expect(result.data[0].id).toBe('3')
      expect(result.data[1].id).toBe('4')
      expect(result.hasMore).toBe(true)
      expect(result.nextCursor).toBe('4')
    })

    test('returns last page correctly', () => {
      const result = paginate(mockItems, { cursor: '4', limit: 2 })
      expect(result.data).toHaveLength(1)
      expect(result.data[0].id).toBe('5')
      expect(result.hasMore).toBe(false)
      expect(result.nextCursor).toBe(null)
    })

    test('handles invalid cursor gracefully', () => {
      const result = paginate(mockItems, { cursor: 'invalid', limit: 2 })
      expect(result.data).toHaveLength(2)
      expect(result.data[0].id).toBe('1')
    })

    test('respects max limit', () => {
      const result = paginate(
        mockItems,
        { limit: 200 },
        { defaultLimit: 10, maxLimit: 3 }
      )
      expect(result.data).toHaveLength(3)
    })

    test('handles empty array', () => {
      const result = paginate([], { limit: 10 })
      expect(result.data).toHaveLength(0)
      expect(result.hasMore).toBe(false)
      expect(result.nextCursor).toBe(null)
      expect(result.total).toBe(0)
    })

    test('uses default limit when not specified', () => {
      const result = paginate(
        mockItems,
        {},
        { defaultLimit: 2, maxLimit: 100 }
      )
      expect(result.data).toHaveLength(2)
      expect(result.hasMore).toBe(true)
    })

    test('enforces minimum limit of 1 for zero limit', () => {
      const result = paginate(mockItems, { limit: 0 })
      expect(result.data).toHaveLength(1)
      expect(result.data[0].id).toBe('1')
      expect(result.hasMore).toBe(true)
    })

    test('enforces minimum limit of 1 for negative limit', () => {
      const result = paginate(mockItems, { limit: -5 })
      expect(result.data).toHaveLength(1)
      expect(result.data[0].id).toBe('1')
      expect(result.hasMore).toBe(true)
    })

    test('treats empty cursor string as no cursor', () => {
      const result = paginate(mockItems, { cursor: '', limit: 2 })
      expect(result.data).toHaveLength(2)
      expect(result.data[0].id).toBe('1')
      expect(result.data[1].id).toBe('2')
    })

    test('treats whitespace-only cursor as no cursor', () => {
      const result = paginate(mockItems, { cursor: '   ', limit: 2 })
      expect(result.data).toHaveLength(2)
      expect(result.data[0].id).toBe('1')
      expect(result.data[1].id).toBe('2')
    })
  })

  describe('parsePaginationParams', () => {
    test('parses cursor and limit from URLSearchParams', () => {
      const params = new URLSearchParams('cursor=abc123&limit=20')
      const result = parsePaginationParams(params)
      expect(result.cursor).toBe('abc123')
      expect(result.limit).toBe(20)
    })

    test('handles missing parameters', () => {
      const params = new URLSearchParams('')
      const result = parsePaginationParams(params)
      expect(result.cursor).toBeUndefined()
      expect(result.limit).toBeUndefined()
    })

    test('handles invalid limit', () => {
      const params = new URLSearchParams('limit=invalid')
      const result = parsePaginationParams(params)
      expect(result.limit).toBeUndefined()
    })

    test('parses only cursor', () => {
      const params = new URLSearchParams('cursor=def456')
      const result = parsePaginationParams(params)
      expect(result.cursor).toBe('def456')
      expect(result.limit).toBeUndefined()
    })

    test('parses only limit', () => {
      const params = new URLSearchParams('limit=15')
      const result = parsePaginationParams(params)
      expect(result.cursor).toBeUndefined()
      expect(result.limit).toBe(15)
    })

    test('rejects zero limit', () => {
      const params = new URLSearchParams('limit=0')
      const result = parsePaginationParams(params)
      expect(result.limit).toBeUndefined()
    })

    test('rejects negative limit', () => {
      const params = new URLSearchParams('limit=-10')
      const result = parsePaginationParams(params)
      expect(result.limit).toBeUndefined()
    })

    test('truncates float limit to integer', () => {
      const params = new URLSearchParams('limit=5.7')
      const result = parsePaginationParams(params)
      expect(result.limit).toBe(5)
    })

    test('treats empty cursor string as undefined', () => {
      const params = new URLSearchParams('cursor=')
      const result = parsePaginationParams(params)
      expect(result.cursor).toBeUndefined()
    })

    test('treats whitespace-only cursor as undefined', () => {
      const params = new URLSearchParams('cursor=   ')
      const result = parsePaginationParams(params)
      expect(result.cursor).toBeUndefined()
    })
  })
})
