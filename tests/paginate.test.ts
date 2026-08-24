import { paginate, getPaginationInfo } from '../src/utils/paginate'

describe('paginate', () => {
  const items = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]

  test('returns first page correctly', () => {
    expect(paginate(items, 1, 3)).toEqual([1, 2, 3])
  })

  test('returns second page correctly (regression test for off-by-one)', () => {
    // This test ensures we use (page - 1) * pageSize, not page * pageSize
    // With the bug, page 2 with pageSize 3 would start at index 6, not 3
    expect(paginate(items, 2, 3)).toEqual([4, 5, 6])
  })

  test('returns third page correctly', () => {
    expect(paginate(items, 3, 3)).toEqual([7, 8, 9])
  })

  test('returns partial last page', () => {
    expect(paginate(items, 4, 3)).toEqual([10])
  })

  test('returns empty array for page beyond total pages', () => {
    expect(paginate(items, 5, 3)).toEqual([])
  })

  test('handles page size of 1', () => {
    expect(paginate(items, 1, 1)).toEqual([1])
    expect(paginate(items, 5, 1)).toEqual([5])
  })

  test('handles page size larger than array', () => {
    expect(paginate(items, 1, 20)).toEqual(items)
  })

  test('handles empty array', () => {
    expect(paginate([], 1, 10)).toEqual([])
  })

  test('throws error for page less than 1', () => {
    expect(() => paginate(items, 0, 10)).toThrow('Page must be >= 1')
    expect(() => paginate(items, -1, 10)).toThrow('Page must be >= 1')
  })

  test('throws error for pageSize less than 1', () => {
    expect(() => paginate(items, 1, 0)).toThrow('PageSize must be >= 1')
    expect(() => paginate(items, 1, -1)).toThrow('PageSize must be >= 1')
  })

  test('throws error for non-finite page', () => {
    expect(() => paginate(items, NaN, 10)).toThrow('Page and pageSize must be finite numbers')
    expect(() => paginate(items, Infinity, 10)).toThrow('Page and pageSize must be finite numbers')
  })

  test('throws error for non-finite pageSize', () => {
    expect(() => paginate(items, 1, NaN)).toThrow('Page and pageSize must be finite numbers')
    expect(() => paginate(items, 1, Infinity)).toThrow('Page and pageSize must be finite numbers')
  })

  test('throws error for non-integer page', () => {
    expect(() => paginate(items, 1.5, 10)).toThrow('Page and pageSize must be integers')
    expect(() => paginate(items, 2.7, 10)).toThrow('Page and pageSize must be integers')
  })

  test('throws error for non-integer pageSize', () => {
    expect(() => paginate(items, 1, 3.5)).toThrow('Page and pageSize must be integers')
    expect(() => paginate(items, 1, 10.1)).toThrow('Page and pageSize must be integers')
  })

  test('works with different data types', () => {
    const strings = ['a', 'b', 'c', 'd', 'e']
    expect(paginate(strings, 2, 2)).toEqual(['c', 'd'])

    const objects = [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }]
    expect(paginate(objects, 2, 2)).toEqual([{ id: 3 }, { id: 4 }])
  })
})

describe('getPaginationInfo', () => {
  test('calculates correct pagination info for first page', () => {
    expect(getPaginationInfo(10, 1, 3)).toEqual({
      totalItems: 10,
      totalPages: 4,
      currentPage: 1,
      pageSize: 3,
      hasNextPage: true,
      hasPrevPage: false,
    })
  })

  test('calculates correct pagination info for middle page', () => {
    expect(getPaginationInfo(10, 2, 3)).toEqual({
      totalItems: 10,
      totalPages: 4,
      currentPage: 2,
      pageSize: 3,
      hasNextPage: true,
      hasPrevPage: true,
    })
  })

  test('calculates correct pagination info for last page', () => {
    expect(getPaginationInfo(10, 4, 3)).toEqual({
      totalItems: 10,
      totalPages: 4,
      currentPage: 4,
      pageSize: 3,
      hasNextPage: false,
      hasPrevPage: true,
    })
  })

  test('handles exact division', () => {
    expect(getPaginationInfo(9, 1, 3)).toEqual({
      totalItems: 9,
      totalPages: 3,
      currentPage: 1,
      pageSize: 3,
      hasNextPage: true,
      hasPrevPage: false,
    })
  })

  test('handles zero items', () => {
    expect(getPaginationInfo(0, 1, 10)).toEqual({
      totalItems: 0,
      totalPages: 0,
      currentPage: 1,
      pageSize: 10,
      hasNextPage: false,
      hasPrevPage: false,
    })
  })

  test('throws error for non-finite parameters', () => {
    expect(() => getPaginationInfo(NaN, 1, 10)).toThrow('All parameters must be finite numbers')
    expect(() => getPaginationInfo(10, Infinity, 10)).toThrow('All parameters must be finite numbers')
    expect(() => getPaginationInfo(10, 1, NaN)).toThrow('All parameters must be finite numbers')
  })

  test('throws error for non-integer parameters', () => {
    expect(() => getPaginationInfo(10.5, 1, 10)).toThrow('All parameters must be integers')
    expect(() => getPaginationInfo(10, 1.5, 10)).toThrow('All parameters must be integers')
    expect(() => getPaginationInfo(10, 1, 10.5)).toThrow('All parameters must be integers')
  })

  test('throws error for negative totalItems', () => {
    expect(() => getPaginationInfo(-1, 1, 10)).toThrow('TotalItems must be >= 0')
    expect(() => getPaginationInfo(-10, 1, 10)).toThrow('TotalItems must be >= 0')
  })

  test('throws error for invalid page in getPaginationInfo', () => {
    expect(() => getPaginationInfo(10, 0, 10)).toThrow('Page must be >= 1')
    expect(() => getPaginationInfo(10, -1, 10)).toThrow('Page must be >= 1')
  })

  test('throws error for invalid pageSize in getPaginationInfo', () => {
    expect(() => getPaginationInfo(10, 1, 0)).toThrow('PageSize must be >= 1')
    expect(() => getPaginationInfo(10, 1, -1)).toThrow('PageSize must be >= 1')
  })
})
