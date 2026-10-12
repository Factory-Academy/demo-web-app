import { reduce } from '../src/utils/array-helpers'

describe('array-helpers', () => {
  describe('reduce', () => {
    test('handles empty array with initial value', () => {
      const result = reduce([], (acc, val) => acc + val, 0)
      expect(result).toBe(0)
    })

    test('accumulates values from non-empty array', () => {
      const result = reduce([1, 2, 3, 4], (acc, val) => acc + val, 0)
      expect(result).toBe(10)
    })

    test('handles empty array with object initial value', () => {
      const result = reduce([], (acc) => ({ ...acc }), { count: 0 })
      expect(result).toEqual({ count: 0 })
    })

    test('reduces array of objects correctly', () => {
      const items = [
        { name: 'apple', quantity: 2 },
        { name: 'banana', quantity: 3 },
        { name: 'orange', quantity: 1 },
      ]
      const result = reduce(
        items,
        (acc, item) => acc + item.quantity,
        0
      )
      expect(result).toBe(6)
    })
  })
})
