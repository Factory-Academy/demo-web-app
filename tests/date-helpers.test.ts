import { getDateDifferenceMs, getAgeDays } from '../src/utils/date-helpers'

describe('date-helpers', () => {
  describe('getDateDifferenceMs', () => {
    test('calculates difference between two Date objects', () => {
      const dateA = new Date('2024-01-15T12:00:00Z')
      const dateB = new Date('2024-01-10T12:00:00Z')
      
      const diff = getDateDifferenceMs(dateA, dateB)
      expect(diff).toBe(5 * 86400000) // 5 days in milliseconds
    })

    test('calculates difference between ISO strings', () => {
      const diff = getDateDifferenceMs('2024-01-15T12:00:00Z', '2024-01-10T12:00:00Z')
      expect(diff).toBe(5 * 86400000)
    })

    test('handles mixed Date and string inputs', () => {
      const dateA = new Date('2024-01-15T12:00:00Z')
      const diff = getDateDifferenceMs(dateA, '2024-01-10T12:00:00Z')
      expect(diff).toBe(5 * 86400000)
    })

    test('returns negative difference when dateB is after dateA', () => {
      const diff = getDateDifferenceMs('2024-01-10T12:00:00Z', '2024-01-15T12:00:00Z')
      expect(diff).toBe(-5 * 86400000)
    })

    test('handles dates with different timezones correctly using UTC', () => {
      // These represent the same moment in time
      const utcDate = '2024-01-15T12:00:00Z'
      const estOffset = '2024-01-15T07:00:00-05:00'
      
      const diff = getDateDifferenceMs(utcDate, estOffset)
      expect(diff).toBe(0) // Should be zero as they're the same moment
    })
  })

  describe('getAgeDays', () => {
    test('calculates age in days for a past date', () => {
      const pastDate = new Date(Date.now() - 10 * 86400000) // 10 days ago
      const age = getAgeDays(pastDate)
      expect(age).toBe(10)
    })

    test('handles ISO string input', () => {
      const pastDate = new Date(Date.now() - 7 * 86400000).toISOString()
      const age = getAgeDays(pastDate)
      expect(age).toBe(7)
    })

    test('returns negative age for future dates', () => {
      const futureDate = new Date(Date.now() + 3 * 86400000) // 3 days from now
      const age = getAgeDays(futureDate)
      expect(age).toBe(-3)
    })

    test('returns 0 for dates less than 24 hours old', () => {
      const recentDate = new Date(Date.now() - 12 * 3600000) // 12 hours ago
      const age = getAgeDays(recentDate)
      expect(age).toBe(0)
    })

    test('handles dates across timezone boundaries', () => {
      // Create a date 25 hours ago
      const date25HoursAgo = new Date(Date.now() - 25 * 3600000)
      const age = getAgeDays(date25HoursAgo)
      expect(age).toBe(1) // Should be 1 day, not affected by local timezone
    })
  })
})
