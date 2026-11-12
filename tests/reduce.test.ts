import { sumBy } from '../src/utils/reduce'

interface TestItem {
  id: string
  value: number
}

describe('reduce utilities', () => {
  describe('sumBy', () => {
    test('sums numeric values from array using selector', () => {
      const items: TestItem[] = [
        { id: '1', value: 10 },
        { id: '2', value: 20 },
        { id: '3', value: 30 },
      ]
      expect(sumBy(items, (item) => item.value)).toBe(60)
    })

    test('returns 0 for empty array without throwing error', () => {
      const items: TestItem[] = []
      expect(sumBy(items, (item) => item.value)).toBe(0)
    })

    test('handles single item array', () => {
      const items: TestItem[] = [{ id: '1', value: 42 }]
      expect(sumBy(items, (item) => item.value)).toBe(42)
    })

    test('works with negative numbers', () => {
      const items: TestItem[] = [
        { id: '1', value: 100 },
        { id: '2', value: -50 },
        { id: '3', value: 25 },
      ]
      expect(sumBy(items, (item) => item.value)).toBe(75)
    })
  })
})
