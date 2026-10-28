import {
  MAX_AGE_DAYS,
  calculatePriority,
  computeAgeInDays,
  computeAgeScore,
  computeBaseScore,
  parseTimestamp,
  scoreToPriority,
} from '../src/services/priority'

const MS_PER_DAY = 86_400_000
const NOW = Date.parse('2026-10-28T00:00:00.000Z')

function daysAgo(days: number): string {
  return new Date(NOW - days * MS_PER_DAY).toISOString()
}

describe('parseTimestamp', () => {
  test('parses ISO strings', () => {
    expect(parseTimestamp('2026-01-01T00:00:00.000Z')).toBe(
      Date.parse('2026-01-01T00:00:00.000Z'),
    )
  })

  test('passes finite epoch-millis numbers through', () => {
    expect(parseTimestamp(1_700_000_000_000)).toBe(1_700_000_000_000)
  })

  test('returns null for malformed strings', () => {
    expect(parseTimestamp('not-a-date')).toBeNull()
  })

  test('returns null for NaN and Infinity', () => {
    expect(parseTimestamp(NaN)).toBeNull()
    expect(parseTimestamp(Infinity)).toBeNull()
  })

  test('returns null for non-string, non-number input', () => {
    expect(parseTimestamp(null)).toBeNull()
    expect(parseTimestamp(undefined)).toBeNull()
    expect(parseTimestamp({})).toBeNull()
    expect(parseTimestamp([])).toBeNull()
  })
})

describe('computeAgeInDays', () => {
  test('computes whole days for a normal past timestamp', () => {
    expect(computeAgeInDays(daysAgo(10), NOW)).toBe(10)
  })

  test('clamps future timestamps to 0 instead of going negative', () => {
    expect(computeAgeInDays(daysAgo(-5), NOW)).toBe(0)
  })

  test('returns 0 for a malformed timestamp instead of NaN', () => {
    expect(computeAgeInDays('garbage', NOW)).toBe(0)
    expect(computeAgeInDays(undefined, NOW)).toBe(0)
  })

  test('clamps absurdly old timestamps to MAX_AGE_DAYS', () => {
    expect(computeAgeInDays('0001-01-01T00:00:00.000Z', NOW)).toBe(MAX_AGE_DAYS)
  })
})

describe('computeAgeScore', () => {
  test('is 0 at or below the start threshold', () => {
    expect(computeAgeScore(0)).toBe(0)
    expect(computeAgeScore(30)).toBe(0)
  })

  test('accrues beyond the start threshold', () => {
    expect(computeAgeScore(100)).toBe(50)
  })
})

describe('computeBaseScore', () => {
  test('adds the urgent bonus', () => {
    expect(computeBaseScore({ status: 'urgent', createdAt: daysAgo(0) }, NOW)).toBe(50)
  })

  test('combines urgent bonus and age score', () => {
    expect(computeBaseScore({ status: 'urgent', createdAt: daysAgo(100) }, NOW)).toBe(100)
  })

  test('does not throw on a malformed timestamp', () => {
    expect(computeBaseScore({ status: 'active', createdAt: 'nope' }, NOW)).toBe(0)
  })
})

describe('scoreToPriority', () => {
  test.each([
    [80, 'critical'],
    [79.9, 'high'],
    [50, 'high'],
    [49.9, 'medium'],
    [20, 'medium'],
    [19.9, 'low'],
    [0, 'low'],
  ])('maps score %p to %p', (score, expected) => {
    expect(scoreToPriority(score as number)).toBe(expected)
  })

  test('maps non-finite scores to low', () => {
    expect(scoreToPriority(NaN)).toBe('low')
    expect(scoreToPriority(Infinity)).toBe('low')
  })
})

describe('calculatePriority', () => {
  test('returns low for null/undefined records', () => {
    expect(calculatePriority(null)).toBe('low')
    expect(calculatePriority(undefined)).toBe('low')
  })

  test('urgent recent record is high', () => {
    expect(calculatePriority({ status: 'urgent', createdAt: daysAgo(1) }, NOW)).toBe('high')
  })

  test('urgent old record escalates to critical', () => {
    expect(calculatePriority({ status: 'urgent', createdAt: daysAgo(100) }, NOW)).toBe('critical')
  })

  test('fresh non-urgent record is low', () => {
    expect(calculatePriority({ status: 'active', createdAt: daysAgo(10) }, NOW)).toBe('low')
  })

  test('aging non-urgent record climbs the buckets', () => {
    expect(calculatePriority({ status: 'active', createdAt: daysAgo(45) }, NOW)).toBe('medium')
    expect(calculatePriority({ status: 'active', createdAt: daysAgo(100) }, NOW)).toBe('high')
    expect(calculatePriority({ status: 'active', createdAt: daysAgo(200) }, NOW)).toBe('critical')
  })

  // Regression: a malformed createdAt used to produce NaN and silently drop
  // an urgent record to 'low'. The urgent bonus must still apply.
  test('urgent record with malformed timestamp stays high', () => {
    expect(calculatePriority({ status: 'urgent', createdAt: 'malformed' }, NOW)).toBe('high')
  })

  test('non-urgent record with malformed timestamp is low', () => {
    expect(calculatePriority({ status: 'active', createdAt: '' }, NOW)).toBe('low')
  })
})
