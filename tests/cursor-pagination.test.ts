import {
  buildCursorQueryParams,
  createCursorResponse,
  validateCursorParams,
  CursorPaginationParams,
} from '@/lib/cursor-pagination'

describe('buildCursorQueryParams', () => {
  test('builds query params with cursor and limit', () => {
    const params: CursorPaginationParams = {
      cursor: 'abc123',
      limit: 10,
    }
    const searchParams = buildCursorQueryParams(params)
    
    expect(searchParams.get('cursor')).toBe('abc123')
    expect(searchParams.get('limit')).toBe('10')
  })

  test('builds query params with only limit when cursor is omitted', () => {
    const params: CursorPaginationParams = {
      limit: 25,
    }
    const searchParams = buildCursorQueryParams(params)
    
    expect(searchParams.get('cursor')).toBeNull()
    expect(searchParams.get('limit')).toBe('25')
  })

  test('handles numeric limit values correctly', () => {
    const params: CursorPaginationParams = {
      cursor: 'xyz',
      limit: 100,
    }
    const searchParams = buildCursorQueryParams(params)
    
    expect(searchParams.get('limit')).toBe('100')
  })
})

describe('validateCursorParams', () => {
  test('accepts valid params within default limit', () => {
    const params: CursorPaginationParams = {
      cursor: 'test',
      limit: 50,
    }
    
    expect(() => validateCursorParams(params)).not.toThrow()
  })

  test('accepts valid params without cursor', () => {
    const params: CursorPaginationParams = {
      limit: 10,
    }
    
    expect(() => validateCursorParams(params)).not.toThrow()
  })

  test('throws when limit is zero', () => {
    const params: CursorPaginationParams = {
      limit: 0,
    }
    
    expect(() => validateCursorParams(params)).toThrow('Limit must be greater than 0')
  })

  test('throws when limit is negative', () => {
    const params: CursorPaginationParams = {
      limit: -5,
    }
    
    expect(() => validateCursorParams(params)).toThrow('Limit must be greater than 0')
  })

  test('throws when limit exceeds default max', () => {
    const params: CursorPaginationParams = {
      limit: 101,
    }
    
    expect(() => validateCursorParams(params)).toThrow('Limit must not exceed 100')
  })

  test('accepts limit equal to max', () => {
    const params: CursorPaginationParams = {
      limit: 100,
    }
    
    expect(() => validateCursorParams(params)).not.toThrow()
  })

  test('respects custom max limit', () => {
    const params: CursorPaginationParams = {
      limit: 150,
    }
    
    expect(() => validateCursorParams(params, 200)).not.toThrow()
    expect(() => validateCursorParams(params, 100)).toThrow('Limit must not exceed 100')
  })
})

describe('createCursorResponse', () => {
  test('creates response with items and nextCursor', () => {
    const items = [{ id: '1', name: 'A' }, { id: '2', name: 'B' }]
    const response = createCursorResponse(items, 'next-token')
    
    expect(response.items).toEqual(items)
    expect(response.nextCursor).toBe('next-token')
    expect(response.hasMore).toBe(true)
  })

  test('creates response with null cursor indicating last page', () => {
    const items = [{ id: '1', name: 'A' }]
    const response = createCursorResponse(items, null)
    
    expect(response.items).toEqual(items)
    expect(response.nextCursor).toBeNull()
    expect(response.hasMore).toBe(false)
  })

  test('creates response with empty items array', () => {
    const response = createCursorResponse([], null)
    
    expect(response.items).toEqual([])
    expect(response.nextCursor).toBeNull()
    expect(response.hasMore).toBe(false)
  })

  test('preserves item types in generic response', () => {
    type TestItem = { id: string; value: number }
    const items: TestItem[] = [{ id: 'x', value: 42 }]
    const response = createCursorResponse<TestItem>(items, 'cursor')
    
    expect(response.items).toEqual(items)
    expect(response.items[0].value).toBe(42)
  })
})
