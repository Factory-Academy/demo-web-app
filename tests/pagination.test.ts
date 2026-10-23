import { calculatePaginationOffset } from '@/lib/pagination'

describe('calculatePaginationOffset', () => {
  test('returns 0 for page 1 with items per page of 10', () => {
    expect(calculatePaginationOffset(1, 10)).toBe(0)
  })

  test('returns 10 for page 2 with items per page of 10', () => {
    expect(calculatePaginationOffset(2, 10)).toBe(10)
  })

  test('returns 20 for page 3 with items per page of 10', () => {
    expect(calculatePaginationOffset(3, 10)).toBe(20)
  })

  test('returns 0 for page 1 with items per page of 20', () => {
    expect(calculatePaginationOffset(1, 20)).toBe(0)
  })

  test('regression: page 1 should start at offset 0, not 10', () => {
    // This is the regression test that would fail with the off-by-one bug
    expect(calculatePaginationOffset(1, 10)).toBe(0)
  })
})
