import { formatDuration } from '../src/utils/duration'

describe('formatDuration', () => {
  test('formats milliseconds for durations under 1 second', () => {
    expect(formatDuration(0)).toBe('0ms')
    expect(formatDuration(50)).toBe('50ms')
    expect(formatDuration(999)).toBe('999ms')
  })

  test('formats sub-10 seconds with decimal precision', () => {
    expect(formatDuration(1000)).toBe('1.0s')
    expect(formatDuration(1500)).toBe('1.5s')
    expect(formatDuration(9999)).toBe('10.0s')
  })

  test('formats seconds without decimals for 10+ seconds', () => {
    expect(formatDuration(10000)).toBe('10s')
    expect(formatDuration(45000)).toBe('45s')
    expect(formatDuration(59000)).toBe('59s')
  })

  test('formats minutes and seconds', () => {
    expect(formatDuration(60000)).toBe('1m')
    expect(formatDuration(90000)).toBe('1m 30s')
    expect(formatDuration(150000)).toBe('2m 30s')
    expect(formatDuration(3540000)).toBe('59m')
  })

  test('formats hours and minutes', () => {
    expect(formatDuration(3600000)).toBe('1h')
    expect(formatDuration(4500000)).toBe('1h 15m')
    expect(formatDuration(7200000)).toBe('2h')
    expect(formatDuration(9000000)).toBe('2h 30m')
  })

  test('omits zero components', () => {
    expect(formatDuration(3600000)).toBe('1h')
    expect(formatDuration(60000)).toBe('1m')
  })

  test('handles negative values gracefully', () => {
    expect(formatDuration(-100)).toBe('0ms')
    expect(formatDuration(-5000)).toBe('0ms')
  })

  test('handles large durations', () => {
    expect(formatDuration(86400000)).toBe('24h')
    expect(formatDuration(90000000)).toBe('25h')
  })
})
