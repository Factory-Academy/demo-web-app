import { sum, average } from '../src/services/array-helpers'

describe('array-helpers', () => {
  describe('sum', () => {
    test('returns 0 for empty array', () => {
      expect(sum([])).toBe(0)
    })

    test('calculates sum of positive numbers', () => {
      expect(sum([1, 2, 3, 4])).toBe(10)
    })

    test('calculates sum with negative numbers', () => {
      expect(sum([5, -3, 2])).toBe(4)
    })

    test('handles single element', () => {
      expect(sum([42])).toBe(42)
    })
  })

  describe('average', () => {
    test('returns 0 for empty array', () => {
      expect(average([])).toBe(0)
    })

    test('calculates average of numbers', () => {
      expect(average([2, 4, 6, 8])).toBe(5)
    })

    test('handles single element', () => {
      expect(average([10])).toBe(10)
    })

    test('calculates fractional average correctly', () => {
      expect(average([1, 2, 3])).toBe(2)
    })
  })
})
