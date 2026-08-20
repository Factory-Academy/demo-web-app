import { formatDuration } from '@/utils/duration'

describe('formatDuration', () => {
  test('formats milliseconds under 1 second', () => {
    expect(formatDuration(0)).toBe('0ms')
    expect(formatDuration(500)).toBe('500ms')
    expect(formatDuration(999)).toBe('999ms')
  })

  test('formats seconds', () => {
    expect(formatDuration(1000)).toBe('1s')
    expect(formatDuration(5000)).toBe('5s')
    expect(formatDuration(59000)).toBe('59s')
  })

  test('formats minutes with seconds', () => {
    expect(formatDuration(60000)).toBe('1m')
    expect(formatDuration(90000)).toBe('1m 30s')
    expect(formatDuration(125000)).toBe('2m 5s')
  })

  test('formats hours with minutes and seconds', () => {
    expect(formatDuration(3600000)).toBe('1h')
    expect(formatDuration(5400000)).toBe('1h 30m')
    expect(formatDuration(3661000)).toBe('1h 1m 1s')
    expect(formatDuration(7325000)).toBe('2h 2m 5s')
  })

  test('formats days with hours, minutes, and seconds', () => {
    expect(formatDuration(86400000)).toBe('1d')
    expect(formatDuration(90061000)).toBe('1d 1h 1m 1s')
    expect(formatDuration(172800000)).toBe('2d')
  })

  test('handles negative values as zero', () => {
    expect(formatDuration(-1)).toBe('0ms')
    expect(formatDuration(-1000)).toBe('0ms')
  })

  test('omits zero components', () => {
    expect(formatDuration(3661000)).toBe('1h 1m 1s')
    expect(formatDuration(3600000)).toBe('1h')
    expect(formatDuration(60000)).toBe('1m')
    expect(formatDuration(1000)).toBe('1s')
  })
})
