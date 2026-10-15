import { computeAgeInDays, parseTimestamp } from '@/services/transform/dates'

describe('parseTimestamp', () => {
  test('parses a valid ISO string', () => {
    const date = parseTimestamp('2024-01-01T00:00:00.000Z')
    expect(date).not.toBeNull()
    expect(date?.toISOString()).toBe('2024-01-01T00:00:00.000Z')
  })

  test('returns the same Date instance when given a valid Date', () => {
    const input = new Date('2024-06-01T12:00:00.000Z')
    expect(parseTimestamp(input)).toBe(input)
  })

  test.each([
    ['empty string', ''],
    ['whitespace only', '   '],
    ['garbage string', 'not-a-date'],
    ['undefined', undefined],
    ['null', null],
    ['number', 1700000000000],
    ['object', { when: 'now' }],
    ['invalid Date', new Date('nope')],
  ])('returns null for %s', (_label, value) => {
    expect(parseTimestamp(value as unknown)).toBeNull()
  })
})

describe('computeAgeInDays', () => {
  const now = new Date('2024-01-31T00:00:00.000Z')

  test('counts whole days between creation and now', () => {
    expect(computeAgeInDays('2024-01-01T00:00:00.000Z', now)).toBe(30)
  })

  test('truncates partial days', () => {
    expect(computeAgeInDays('2024-01-29T12:00:00.000Z', now)).toBe(1)
  })

  test('returns 0 for a future timestamp', () => {
    expect(computeAgeInDays('2024-02-15T00:00:00.000Z', now)).toBe(0)
  })

  test('returns 0 for the same instant', () => {
    expect(computeAgeInDays('2024-01-31T00:00:00.000Z', now)).toBe(0)
  })

  test.each([['empty', ''], ['missing', undefined], ['garbage', 'not-a-date']])(
    'returns 0 (never NaN) for a %s timestamp',
    (_label, value) => {
      const age = computeAgeInDays(value as unknown, now)
      expect(Number.isNaN(age)).toBe(false)
      expect(age).toBe(0)
    },
  )
})
