import { formatDuration } from '../src/utils/format-duration'

describe('formatDuration', () => {
  test('formats zero milliseconds', () => {
    expect(formatDuration(0)).toBe('0 seconds')
  })

  test('formats negative values as zero', () => {
    expect(formatDuration(-1000)).toBe('0 seconds')
  })

  test('formats seconds', () => {
    expect(formatDuration(1000)).toBe('1 second')
    expect(formatDuration(2000)).toBe('2 seconds')
    expect(formatDuration(45000)).toBe('45 seconds')
  })

  test('formats minutes', () => {
    expect(formatDuration(60000)).toBe('1 minute')
    expect(formatDuration(120000)).toBe('2 minutes')
    expect(formatDuration(300000)).toBe('5 minutes')
  })

  test('formats hours', () => {
    expect(formatDuration(3600000)).toBe('1 hour')
    expect(formatDuration(7200000)).toBe('2 hours')
    expect(formatDuration(18000000)).toBe('5 hours')
  })

  test('formats days', () => {
    expect(formatDuration(86400000)).toBe('1 day')
    expect(formatDuration(172800000)).toBe('2 days')
    expect(formatDuration(432000000)).toBe('5 days')
  })

  test('rounds down to largest unit', () => {
    expect(formatDuration(90000)).toBe('1 minute')
    expect(formatDuration(3661000)).toBe('1 hour')
    expect(formatDuration(90000000)).toBe('1 day')
  })
})
