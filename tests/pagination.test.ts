import { getPaginationInfo, paginateArray } from '../src/utils/pagination'

describe('getPaginationInfo', () => {
  test('calculates correct pagination for first page', () => {
    const result = getPaginationInfo(25, 1, 10)
    
    expect(result.totalItems).toBe(25)
    expect(result.totalPages).toBe(3)
    expect(result.currentPage).toBe(1)
    expect(result.startIndex).toBe(0)
    expect(result.endIndex).toBe(10)
    expect(result.hasNextPage).toBe(true)
    expect(result.hasPreviousPage).toBe(false)
  })

  test('calculates correct pagination for middle page', () => {
    const result = getPaginationInfo(25, 2, 10)
    
    expect(result.currentPage).toBe(2)
    expect(result.startIndex).toBe(10)
    expect(result.endIndex).toBe(20)
    expect(result.hasNextPage).toBe(true)
    expect(result.hasPreviousPage).toBe(true)
  })

  test('calculates correct pagination for last page with partial items', () => {
    const result = getPaginationInfo(25, 3, 10)
    
    expect(result.currentPage).toBe(3)
    expect(result.startIndex).toBe(20)
    expect(result.endIndex).toBe(25)
    expect(result.hasNextPage).toBe(false)
    expect(result.hasPreviousPage).toBe(true)
  })

  test('handles exact multiple of page size (regression test for off-by-one)', () => {
    const result = getPaginationInfo(30, 3, 10)
    
    expect(result.totalPages).toBe(3)
    expect(result.currentPage).toBe(3)
    expect(result.startIndex).toBe(20)
    expect(result.endIndex).toBe(30)
    expect(result.hasNextPage).toBe(false)
  })

  test('handles single page', () => {
    const result = getPaginationInfo(5, 1, 10)
    
    expect(result.totalPages).toBe(1)
    expect(result.startIndex).toBe(0)
    expect(result.endIndex).toBe(5)
    expect(result.hasNextPage).toBe(false)
    expect(result.hasPreviousPage).toBe(false)
  })

  test('handles empty collection', () => {
    const result = getPaginationInfo(0, 1, 10)
    
    expect(result.totalPages).toBe(0)
    expect(result.startIndex).toBe(0)
    expect(result.endIndex).toBe(0)
    expect(result.hasNextPage).toBe(false)
  })

  test('caps page number to total pages', () => {
    const result = getPaginationInfo(25, 100, 10)
    
    expect(result.currentPage).toBe(3)
    expect(result.startIndex).toBe(20)
    expect(result.endIndex).toBe(25)
  })

  test('throws error for invalid parameters', () => {
    expect(() => getPaginationInfo(-1, 1, 10)).toThrow('Invalid pagination parameters')
    expect(() => getPaginationInfo(10, 0, 10)).toThrow('Invalid pagination parameters')
    expect(() => getPaginationInfo(10, 1, 0)).toThrow('Invalid pagination parameters')
  })
})

describe('paginateArray', () => {
  const testItems = Array.from({ length: 25 }, (_, i) => `item-${i + 1}`)

  test('returns correct items for first page', () => {
    const result = paginateArray(testItems, 1, 10)
    
    expect(result.items).toHaveLength(10)
    expect(result.items[0]).toBe('item-1')
    expect(result.items[9]).toBe('item-10')
    expect(result.totalPages).toBe(3)
  })

  test('returns correct items for last page', () => {
    const result = paginateArray(testItems, 3, 10)
    
    expect(result.items).toHaveLength(5)
    expect(result.items[0]).toBe('item-21')
    expect(result.items[4]).toBe('item-25')
  })

  test('handles empty array', () => {
    const result = paginateArray([], 1, 10)
    
    expect(result.items).toHaveLength(0)
    expect(result.totalPages).toBe(0)
  })

  test('returns correct slice for exact page boundary (regression test)', () => {
    const exactItems = Array.from({ length: 30 }, (_, i) => `item-${i + 1}`)
    const result = paginateArray(exactItems, 3, 10)
    
    expect(result.items).toHaveLength(10)
    expect(result.items[0]).toBe('item-21')
    expect(result.items[9]).toBe('item-30')
    expect(result.hasNextPage).toBe(false)
  })
})
