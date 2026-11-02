import { formatDuration } from '../src/utils/format-duration'

describe('formatDuration', () => {
  describe('seconds', () => {
    test('formats zero milliseconds', () => {
      expect(formatDuration(0)).toBe('0s')
    })

    test('formats less than one second', () => {
      expect(formatDuration(500)).toBe('0s')
    })

    test('formats exact seconds', () => {
      expect(formatDuration(5000)).toBe('5s')
    })

    test('formats seconds with partial milliseconds', () => {
      expect(formatDuration(5500)).toBe('5s')
    })
  })

  describe('minutes', () => {
    test('formats exact minutes', () => {
      expect(formatDuration(120000)).toBe('2m')
    })

    test('formats minutes with seconds', () => {
      expect(formatDuration(150000)).toBe('2m 30s')
    })

    test('formats one minute', () => {
      expect(formatDuration(60000)).toBe('1m')
    })
  })

  describe('hours', () => {
    test('formats exact hours', () => {
      expect(formatDuration(7200000)).toBe('2h')
    })

    test('formats hours with minutes', () => {
      expect(formatDuration(5400000)).toBe('1h 30m')
    })

    test('omits seconds when hours are present', () => {
      expect(formatDuration(3665000)).toBe('1h 1m')
    })
  })

  describe('days', () => {
    test('formats exact days', () => {
      expect(formatDuration(172800000)).toBe('2d')
    })

    test('formats days with hours', () => {
      expect(formatDuration(90000000)).toBe('1d 1h')
    })

    test('omits minutes and seconds when days are present', () => {
      expect(formatDuration(86460000)).toBe('1d')
    })
  })

  describe('edge cases', () => {
    test('handles negative values', () => {
      expect(formatDuration(-1000)).toBe('0s')
    })

    test('handles very large values', () => {
      expect(formatDuration(999999999999)).toBe('11574d 1h')
    })

    test('handles one millisecond', () => {
      expect(formatDuration(1)).toBe('0s')
    })
  })
})
