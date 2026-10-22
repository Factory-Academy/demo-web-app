import {
  MS_PER_DAY,
  ageInDays,
  classifyPriority,
  computePriority,
  scorePriority,
} from '@/lib/item-rules/priority'
import { Item } from '@/models/item'

// A fixed "now" keeps every age computation deterministic.
const NOW = Date.UTC(2024, 5, 1)

/** ISO timestamp for a record created `n` days before NOW. */
function daysAgo(n: number): string {
  return new Date(NOW - n * MS_PER_DAY).toISOString()
}

function item(overrides: Partial<Item> = {}): Item {
  return {
    id: '1',
    name: 'Test',
    status: 'active',
    createdAt: daysAgo(0),
    updatedAt: daysAgo(0),
    ...overrides,
  }
}

describe('ageInDays', () => {
  test('counts whole days between createdAt and now', () => {
    expect(ageInDays(daysAgo(0), NOW)).toBe(0)
    expect(ageInDays(daysAgo(1), NOW)).toBe(1)
    expect(ageInDays(daysAgo(45), NOW)).toBe(45)
  })

  test('floors partial days', () => {
    const createdAt = new Date(NOW - (2 * MS_PER_DAY + MS_PER_DAY / 2)).toISOString()
    expect(ageInDays(createdAt, NOW)).toBe(2)
  })

  test('is negative for a future createdAt', () => {
    expect(ageInDays(daysAgo(-3), NOW)).toBe(-3)
  })

  test('returns NaN for an unparseable timestamp', () => {
    expect(Number.isNaN(ageInDays('not-a-date', NOW))).toBe(true)
  })
})

describe('scorePriority', () => {
  test('a fresh, non-urgent record scores zero', () => {
    expect(scorePriority(item({ status: 'active', createdAt: daysAgo(0) }), NOW)).toBe(0)
  })

  test('an urgent status adds a flat 50', () => {
    expect(scorePriority(item({ status: 'urgent', createdAt: daysAgo(0) }), NOW)).toBe(50)
  })

  test('age at the 30-day threshold contributes nothing (strictly greater)', () => {
    expect(scorePriority(item({ status: 'active', createdAt: daysAgo(30) }), NOW)).toBe(0)
  })

  test('age past the threshold adds 0.5 per day', () => {
    expect(scorePriority(item({ status: 'active', createdAt: daysAgo(40) }), NOW)).toBe(20)
    expect(scorePriority(item({ status: 'active', createdAt: daysAgo(100) }), NOW)).toBe(50)
  })

  test('urgency and age stack', () => {
    expect(scorePriority(item({ status: 'urgent', createdAt: daysAgo(60) }), NOW)).toBe(80)
  })

  test('an unparseable createdAt contributes no age score', () => {
    expect(scorePriority(item({ status: 'urgent', createdAt: 'nope' }), NOW)).toBe(50)
    expect(scorePriority(item({ status: 'active', createdAt: 'nope' }), NOW)).toBe(0)
  })
})

describe('classifyPriority', () => {
  test('maps scores to levels at the documented boundaries', () => {
    expect(classifyPriority(80)).toBe('critical')
    expect(classifyPriority(79.5)).toBe('high')
    expect(classifyPriority(50)).toBe('high')
    expect(classifyPriority(49.5)).toBe('medium')
    expect(classifyPriority(20)).toBe('medium')
    expect(classifyPriority(19.5)).toBe('low')
    expect(classifyPriority(0)).toBe('low')
  })
})

describe('computePriority', () => {
  test('urgent + aged tips into critical', () => {
    expect(computePriority(item({ status: 'urgent', createdAt: daysAgo(60) }), NOW)).toBe(
      'critical',
    )
  })

  test('urgent alone is high', () => {
    expect(computePriority(item({ status: 'urgent', createdAt: daysAgo(0) }), NOW)).toBe('high')
  })

  test('aged-but-not-urgent climbs with age', () => {
    expect(computePriority(item({ status: 'active', createdAt: daysAgo(40) }), NOW)).toBe('medium')
    expect(computePriority(item({ status: 'active', createdAt: daysAgo(160) }), NOW)).toBe(
      'critical',
    )
  })

  test('a fresh, non-urgent record is low', () => {
    expect(computePriority(item({ status: 'active', createdAt: daysAgo(0) }), NOW)).toBe('low')
  })
})
