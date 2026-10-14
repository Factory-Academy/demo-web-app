import {
  AGE_GRACE_DAYS,
  MS_PER_DAY,
  PRIORITY_THRESHOLDS,
  PRIORITY_WEIGHTS,
  Scorable,
  ageInDays,
  classifyPriority,
  computePriority,
  scorePriority,
} from '@/services/item/priority'

const NOW = new Date('2026-01-01T00:00:00.000Z').getTime()

/** Build a record whose createdAt is `days` whole days before NOW. */
function recordAgedDays(days: number, status = 'active'): Scorable {
  return { status, createdAt: new Date(NOW - days * MS_PER_DAY).toISOString() }
}

describe('ageInDays', () => {
  test('counts whole days and floors partial days', () => {
    expect(ageInDays(new Date(NOW - 10 * MS_PER_DAY).toISOString(), NOW)).toBe(10)

    const createdAt = new Date(NOW - (10 * MS_PER_DAY + MS_PER_DAY / 2)).toISOString()
    expect(ageInDays(createdAt, NOW)).toBe(10)
  })

  test('is zero when created exactly now', () => {
    expect(ageInDays(new Date(NOW).toISOString(), NOW)).toBe(0)
  })

  test('is negative for future dates', () => {
    expect(ageInDays(new Date(NOW + 5 * MS_PER_DAY).toISOString(), NOW)).toBe(-5)
  })

  test('is NaN for an unparseable date', () => {
    expect(Number.isNaN(ageInDays('not-a-date', NOW))).toBe(true)
  })
})

describe('scorePriority', () => {
  test('fresh, non-urgent record scores zero', () => {
    expect(scorePriority(recordAgedDays(0), NOW)).toBe(0)
  })

  test('urgent status adds the urgent weight', () => {
    expect(scorePriority(recordAgedDays(0, 'urgent'), NOW)).toBe(
      PRIORITY_WEIGHTS.urgentStatus,
    )
  })

  test('age at exactly the grace boundary contributes nothing', () => {
    expect(scorePriority(recordAgedDays(AGE_GRACE_DAYS), NOW)).toBe(0)
  })

  test('age one day past the grace window starts contributing', () => {
    // 31 * 0.5 = 15.5
    expect(scorePriority(recordAgedDays(31), NOW)).toBeCloseTo(15.5, 5)
  })

  test('age and urgent status stack', () => {
    // 50 + (60 * 0.5) = 80
    expect(scorePriority(recordAgedDays(60, 'urgent'), NOW)).toBeCloseTo(80, 5)
  })

  test('future createdAt never adds age score', () => {
    expect(scorePriority(recordAgedDays(-5), NOW)).toBe(0)
    expect(scorePriority(recordAgedDays(-5, 'urgent'), NOW)).toBe(
      PRIORITY_WEIGHTS.urgentStatus,
    )
  })

  test('unparseable createdAt never adds age score', () => {
    expect(scorePriority({ status: 'active', createdAt: 'nope' }, NOW)).toBe(0)
    expect(scorePriority({ status: 'urgent', createdAt: 'nope' }, NOW)).toBe(
      PRIORITY_WEIGHTS.urgentStatus,
    )
  })
})

describe('classifyPriority', () => {
  test('maps scores to labels at each threshold boundary', () => {
    expect(classifyPriority(80)).toBe('critical')
    expect(classifyPriority(79.999)).toBe('high')
    expect(classifyPriority(50)).toBe('high')
    expect(classifyPriority(49.999)).toBe('medium')
    expect(classifyPriority(20)).toBe('medium')
    expect(classifyPriority(19.999)).toBe('low')
    expect(classifyPriority(0)).toBe('low')
  })

  test('well above the top threshold is still critical', () => {
    expect(classifyPriority(1000)).toBe('critical')
  })

  test('negative and NaN scores fall through to low', () => {
    expect(classifyPriority(-10)).toBe('low')
    expect(classifyPriority(NaN)).toBe('low')
  })

  test('thresholds are ordered highest-first', () => {
    const mins = PRIORITY_THRESHOLDS.map(([, min]) => min)
    const sortedDesc = [...mins].sort((a, b) => b - a)
    expect(mins).toEqual(sortedDesc)
  })
})

describe('computePriority', () => {
  test.each([
    ['fresh active', recordAgedDays(0), 'low'],
    ['urgent and fresh', recordAgedDays(0, 'urgent'), 'high'],
    ['40 days old', recordAgedDays(40), 'medium'],
    ['100 days old', recordAgedDays(100), 'high'],
    ['160 days old', recordAgedDays(160), 'critical'],
    ['urgent and 60 days old', recordAgedDays(60, 'urgent'), 'critical'],
    ['urgent and 59 days old', recordAgedDays(59, 'urgent'), 'high'],
  ])('%s -> %s', (_label: string, record: Scorable, expected: string) => {
    expect(computePriority(record, NOW)).toBe(expected)
  })

  test('is deterministic for a fixed now', () => {
    const record = recordAgedDays(45, 'urgent')
    expect(computePriority(record, NOW)).toBe(computePriority(record, NOW))
  })
})
