import { calculateAgeDays } from '../src/utils/date-utils'

describe('date-utils', () => {
  describe('calculateAgeDays', () => {
    test('calculates age for records created today', () => {
      const now = new Date().toISOString()
      expect(calculateAgeDays(now)).toBe(0)
    })

    test('calculates age for records created yesterday', () => {
      const yesterday = new Date(Date.now() - 86400000).toISOString()
      expect(calculateAgeDays(yesterday)).toBe(1)
    })

    test('calculates age for records created 30 days ago', () => {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString()
      expect(calculateAgeDays(thirtyDaysAgo)).toBe(30)
    })

    test('calculates age for records created 90 days ago', () => {
      const ninetyDaysAgo = new Date(Date.now() - 90 * 86400000).toISOString()
      expect(calculateAgeDays(ninetyDaysAgo)).toBe(90)
    })

    test('floors partial days', () => {
      const halfDayAgo = new Date(Date.now() - 43200000).toISOString() // 12 hours
      expect(calculateAgeDays(halfDayAgo)).toBe(0)
    })
  })
})
