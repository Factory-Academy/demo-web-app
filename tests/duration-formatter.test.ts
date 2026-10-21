import { formatDuration } from '../src/services/duration-formatter'

describe('formatDuration', () => {
  test('formats milliseconds', () => {
    expect(formatDuration(0)).toBe('0ms')
    expect(formatDuration(500)).toBe('500ms')
    expect(formatDuration(999)).toBe('999ms')
  })

  test('formats seconds', () => {
    expect(formatDuration(1000)).toBe('1s')
    expect(formatDuration(5000)).toBe('5s')
    expect(formatDuration(45000)).toBe('45s')
  })

  test('formats minutes', () => {
    expect(formatDuration(60000)).toBe('1m')
    expect(formatDuration(120000)).toBe('2m')
    expect(formatDuration(90000)).toBe('1m 30s')
  })

  test('formats hours', () => {
    expect(formatDuration(3600000)).toBe('1h')
    expect(formatDuration(7200000)).toBe('2h')
    expect(formatDuration(5400000)).toBe('1h 30m')
  })

  test('formats days', () => {
    expect(formatDuration(86400000)).toBe('1d')
    expect(formatDuration(172800000)).toBe('2d')
    expect(formatDuration(90000000)).toBe('1d 1h')
  })

  test('handles negative values', () => {
    expect(formatDuration(-1000)).toBe('0ms')
  })
})
