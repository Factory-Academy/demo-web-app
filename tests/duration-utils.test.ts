import { formatDuration } from '../src/utils/duration-utils'

describe('duration-utils', () => {
  describe('formatDuration', () => {
    test('formats milliseconds', () => {
      expect(formatDuration(0)).toBe('0ms')
      expect(formatDuration(500)).toBe('500ms')
      expect(formatDuration(999)).toBe('999ms')
    })

    test('formats seconds', () => {
      expect(formatDuration(1000)).toBe('1s')
      expect(formatDuration(1500)).toBe('1.5s')
      expect(formatDuration(59999)).toBe('60s')
    })

    test('formats minutes and seconds', () => {
      expect(formatDuration(60000)).toBe('1m')
      expect(formatDuration(90000)).toBe('1m 30s')
      expect(formatDuration(150000)).toBe('2m 30s')
      expect(formatDuration(3599000)).toBe('59m 59s')
    })

    test('formats hours and minutes', () => {
      expect(formatDuration(3600000)).toBe('1h')
      expect(formatDuration(5400000)).toBe('1h 30m')
      expect(formatDuration(7320000)).toBe('2h 2m')
    })

    test('handles negative durations', () => {
      expect(formatDuration(-1000)).toBe('0ms')
      expect(formatDuration(-1)).toBe('0ms')
    })

    test('removes trailing .0 from seconds', () => {
      expect(formatDuration(2000)).toBe('2s')
      expect(formatDuration(5000)).toBe('5s')
    })
  })
})
