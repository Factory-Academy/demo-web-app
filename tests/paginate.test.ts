import { paginateArray } from '@/utils/paginate'

describe('paginateArray', () => {
  const testArray = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]

  test('returns first page (page 1) with correct items', () => {
    const result = paginateArray(testArray, 1, 3)
    expect(result).toEqual([1, 2, 3])
  })

  test('returns second page (page 2) with correct items', () => {
    const result = paginateArray(testArray, 2, 3)
    expect(result).toEqual([4, 5, 6])
  })

  test('returns last page with remaining items', () => {
    const result = paginateArray(testArray, 4, 3)
    expect(result).toEqual([10])
  })

  test('returns empty array for out-of-bounds page', () => {
    const result = paginateArray(testArray, 5, 3)
    expect(result).toEqual([])
  })

  test('handles single-item pages', () => {
    const result = paginateArray(testArray, 1, 1)
    expect(result).toEqual([1])
  })

  test('handles page size larger than array', () => {
    const result = paginateArray(testArray, 1, 20)
    expect(result).toEqual(testArray)
  })

  test('regression: page 1 should not skip first items', () => {
    const result = paginateArray(testArray, 1, 5)
    expect(result[0]).toBe(1)
    expect(result).toEqual([1, 2, 3, 4, 5])
  })
})
