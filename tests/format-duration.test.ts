import { formatDuration } from '../src/utils/format-duration'

describe('formatDuration', () => {
  test('returns 0s for zero milliseconds', () => {
    expect(formatDuration(0)).toBe('0s')
  })

  test('formats seconds only', () => {
    expect(formatDuration(5000)).toBe('5s')
    expect(formatDuration(45000)).toBe('45s')
  })

  test('formats minutes and seconds', () => {
    expect(formatDuration(65000)).toBe('1m 5s')
    expect(formatDuration(305000)).toBe('5m 5s')
  })

  test('formats hours, minutes, and seconds', () => {
    expect(formatDuration(3665000)).toBe('1h 1m 5s')
    expect(formatDuration(7325000)).toBe('2h 2m 5s')
  })

  test('formats days, hours, minutes, and seconds', () => {
    expect(formatDuration(90061000)).toBe('1d 1h 1m 1s')
    expect(formatDuration(176461000)).toBe('2d 1h 1m 1s')
  })

  test('omits zero values', () => {
    expect(formatDuration(3600000)).toBe('1h')
    expect(formatDuration(60000)).toBe('1m')
    expect(formatDuration(86400000)).toBe('1d')
    expect(formatDuration(90000000)).toBe('1d 1h')
  })

  test('handles negative values as absolute', () => {
    expect(formatDuration(-5000)).toBe('5s')
    expect(formatDuration(-65000)).toBe('1m 5s')
  })

  test('handles large durations', () => {
    expect(formatDuration(259261000)).toBe('3d 1h 1m 1s')
  })

  test('handles milliseconds less than a second', () => {
    expect(formatDuration(500)).toBe('0s')
    expect(formatDuration(999)).toBe('0s')
  })
})
