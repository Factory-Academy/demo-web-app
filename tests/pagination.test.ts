import { paginate, PaginationParams } from '../src/utils/pagination'

describe('paginate', () => {
  const testItems = [
    { id: '1', name: 'Item 1' },
    { id: '2', name: 'Item 2' },
    { id: '3', name: 'Item 3' },
    { id: '4', name: 'Item 4' },
    { id: '5', name: 'Item 5' },
  ]

  test('returns first page with default limit', () => {
    const result = paginate(testItems, {})
    expect(result.items).toHaveLength(5)
    expect(result.hasMore).toBe(false)
    expect(result.nextCursor).toBeNull()
  })

  test('returns first page with custom limit', () => {
    const result = paginate(testItems, { limit: 2 })
    expect(result.items).toHaveLength(2)
    expect(result.items[0].id).toBe('1')
    expect(result.items[1].id).toBe('2')
    expect(result.hasMore).toBe(true)
    expect(result.nextCursor).toBe('2')
  })

  test('returns second page using cursor', () => {
    const result = paginate(testItems, { cursor: '2', limit: 2 })
    expect(result.items).toHaveLength(2)
    expect(result.items[0].id).toBe('3')
    expect(result.items[1].id).toBe('4')
    expect(result.hasMore).toBe(true)
    expect(result.nextCursor).toBe('4')
  })

  test('returns last page correctly', () => {
    const result = paginate(testItems, { cursor: '4', limit: 2 })
    expect(result.items).toHaveLength(1)
    expect(result.items[0].id).toBe('5')
    expect(result.hasMore).toBe(false)
    expect(result.nextCursor).toBeNull()
  })

  test('handles invalid cursor by returning from start', () => {
    const result = paginate(testItems, { cursor: 'invalid', limit: 2 })
    expect(result.items).toHaveLength(2)
    expect(result.items[0].id).toBe('1')
  })

  test('handles empty array', () => {
    const result = paginate([], { limit: 2 })
    expect(result.items).toHaveLength(0)
    expect(result.hasMore).toBe(false)
    expect(result.nextCursor).toBeNull()
  })

  test('enforces maximum limit of 100', () => {
    const manyItems = Array.from({ length: 150 }, (_, i) => ({ 
      id: String(i + 1), 
      name: `Item ${i + 1}` 
    }))
    const result = paginate(manyItems, { limit: 200 })
    expect(result.items).toHaveLength(100)
    expect(result.hasMore).toBe(true)
  })

  test('enforces minimum limit of 1', () => {
    const result = paginate(testItems, { limit: 0 })
    expect(result.items).toHaveLength(1)
  })

  test('returns correct hasMore for exact page size', () => {
    const result = paginate(testItems, { limit: 5 })
    expect(result.items).toHaveLength(5)
    expect(result.hasMore).toBe(false)
    expect(result.nextCursor).toBeNull()
  })
})
