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

    test('uses UTC calendar-day comparison, not millisecond difference', () => {
      const nowSpy = jest
        .spyOn(Date, 'now')
        .mockReturnValue(new Date('2026-02-10T00:00:00.000Z').getTime())

      // Created late on Jan 1 (just before midnight UTC)
      const age = calculateAgeDays('2026-01-01T23:59:59.000Z')
      
      // Should be 40 calendar days, not based on exact milliseconds
      expect(age).toBe(40)
      
      nowSpy.mockRestore()
    })

    test('handles cross-timezone scenarios correctly', () => {
      const nowSpy = jest
        .spyOn(Date, 'now')
        .mockReturnValue(new Date('2026-02-15T00:00:01.000Z').getTime())

      // Created just after midnight on Feb 14 in another timezone
      const age = calculateAgeDays('2026-02-14T00:00:01.000Z')
      
      // Should be 1 calendar day
      expect(age).toBe(1)
      
      nowSpy.mockRestore()
    })

    test('floors partial days consistently', () => {
      const nowSpy = jest
        .spyOn(Date, 'now')
        .mockReturnValue(new Date('2026-03-01T12:00:00.000Z').getTime())

      // Created on same calendar day but earlier
      const sameDay = calculateAgeDays('2026-03-01T06:00:00.000Z')
      expect(sameDay).toBe(0)
      
      // Created previous calendar day
      const previousDay = calculateAgeDays('2026-02-28T18:00:00.000Z')
      expect(previousDay).toBe(1)
      
      nowSpy.mockRestore()
    })
  })
})
