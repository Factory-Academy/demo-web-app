import {
  AgeWeightedStrategy,
  StatusWeightedStrategy,
} from '../src/services/priority-strategies'
import { MILLIS_PER_DAY } from '../src/services/priority-scoring'

const NOW = new Date('2026-09-15T00:00:00.000Z')

function daysAgo(days: number): Date {
  return new Date(NOW.getTime() - days * MILLIS_PER_DAY)
}

describe('StatusWeightedStrategy', () => {
  const strategy = new StatusWeightedStrategy()

  test('exposes a stable name', () => {
    expect(strategy.name).toBe('status-weighted')
  })

  test('scores a fresh urgent item as high', () => {
    const result = strategy.evaluate({ status: 'urgent', createdAt: NOW }, NOW)
    expect(result.score).toBe(50)
    expect(result.level).toBe('high')
  })

  test('escalates an aged urgent item to critical', () => {
    // 50 (urgent) + 90 * 0.5 (aging beyond 30d grace) = 95
    const result = strategy.evaluate(
      { status: 'urgent', createdAt: daysAgo(90) },
      NOW
    )
    expect(result.score).toBe(95)
    expect(result.level).toBe('critical')
  })

  test('ignores age within the 30-day grace period', () => {
    const result = strategy.evaluate(
      { status: 'active', createdAt: daysAgo(20) },
      NOW
    )
    expect(result.score).toBe(0)
    expect(result.level).toBe('low')
  })

  test('ages a non-urgent item into medium once past the grace period', () => {
    // 90 * 0.5 = 45
    const result = strategy.evaluate(
      { status: 'active', createdAt: daysAgo(90) },
      NOW
    )
    expect(result.score).toBe(45)
    expect(result.level).toBe('medium')
  })

  test('treats a future createdAt as zero age', () => {
    const future = new Date(NOW.getTime() + 100 * MILLIS_PER_DAY)
    const result = strategy.evaluate({ status: 'active', createdAt: future }, NOW)
    expect(result.score).toBe(0)
    expect(result.level).toBe('low')
  })

  test('handles missing status and createdAt', () => {
    const result = strategy.evaluate({}, NOW)
    expect(result.score).toBe(0)
    expect(result.level).toBe('low')
    expect(result.reasons).toContain('no elevating factors')
  })

  test('records reasons for each contributing factor', () => {
    const result = strategy.evaluate(
      { status: 'urgent', createdAt: daysAgo(90) },
      NOW
    )
    expect(result.reasons).toHaveLength(2)
    expect(result.reasons[0]).toContain('urgent')
    expect(result.reasons[1]).toContain('aged')
  })

  test('matches urgent status case-insensitively and ignores surrounding whitespace', () => {
    const result = strategy.evaluate({ status: '  URGENT ', createdAt: NOW }, NOW)
    expect(result.score).toBe(50)
    expect(result.level).toBe('high')
    expect(result.reasons[0]).toContain('urgent')
  })

  test('does not elevate a blank status', () => {
    const result = strategy.evaluate({ status: '   ', createdAt: NOW }, NOW)
    expect(result.score).toBe(0)
    expect(result.level).toBe('low')
    expect(result.reasons).toContain('no elevating factors')
  })

  test('honours custom weighting parameters', () => {
    // urgentBonus 100, grace 0 days, 1 point/day → 100 + 5 = 105
    const custom = new StatusWeightedStrategy(100, 0, 1)
    const result = custom.evaluate(
      { status: 'urgent', createdAt: daysAgo(5) },
      NOW
    )
    expect(result.score).toBe(105)
    expect(result.level).toBe('critical')
  })
})

describe('AgeWeightedStrategy', () => {
  const strategy = new AgeWeightedStrategy()

  test('exposes a stable name', () => {
    expect(strategy.name).toBe('age-weighted')
  })

  test('accrues score linearly from day zero', () => {
    // 10 days * 2 = 20
    const result = strategy.evaluate(
      { status: 'active', createdAt: daysAgo(10) },
      NOW
    )
    expect(result.score).toBe(20)
    expect(result.level).toBe('medium')
  })

  test('adds a modest bonus for urgent status', () => {
    // 5 * 2 + 20 = 30
    const result = strategy.evaluate(
      { status: 'urgent', createdAt: daysAgo(5) },
      NOW
    )
    expect(result.score).toBe(30)
    expect(result.level).toBe('medium')
  })

  test('adds a smaller bonus for pending status', () => {
    // 40 * 2 + 10 = 90
    const result = strategy.evaluate(
      { status: 'pending', createdAt: daysAgo(40) },
      NOW
    )
    expect(result.score).toBe(90)
    expect(result.level).toBe('critical')
  })

  test('gives no bonus for an unrecognized status', () => {
    // 3 * 2 = 6, status 'active' has no bonus
    const result = strategy.evaluate(
      { status: 'active', createdAt: daysAgo(3) },
      NOW
    )
    expect(result.score).toBe(6)
    expect(result.level).toBe('low')
  })

  test('scores a brand-new item with no status as low', () => {
    const result = strategy.evaluate({ createdAt: NOW }, NOW)
    expect(result.score).toBe(0)
    expect(result.level).toBe('low')
    expect(result.reasons).toContain('no elevating factors')
  })

  test('differs from the status-weighted strategy on a stale backlog item', () => {
    const input = { status: 'pending', createdAt: daysAgo(40) }
    const ageResult = new AgeWeightedStrategy().evaluate(input, NOW)
    const statusResult = new StatusWeightedStrategy().evaluate(input, NOW)

    // Age-weighted treats the stale pending item as critical; status-weighted,
    // which only rewards 'urgent', leaves it far lower.
    expect(ageResult.level).toBe('critical')
    expect(statusResult.level).not.toBe('critical')
  })

  test('applies the status bonus case-insensitively and ignores surrounding whitespace', () => {
    // 5 * 2 + 10 (pending) = 20
    const result = strategy.evaluate(
      { status: ' Pending ', createdAt: daysAgo(5) },
      NOW
    )
    expect(result.score).toBe(20)
    expect(result.reasons.some((r) => r.includes("status 'pending'"))).toBe(true)
  })

  test('gives no bonus for a blank status', () => {
    // 3 * 2 = 6, blank status contributes nothing
    const result = strategy.evaluate(
      { status: '   ', createdAt: daysAgo(3) },
      NOW
    )
    expect(result.score).toBe(6)
    expect(result.reasons.some((r) => r.startsWith('status'))).toBe(false)
  })

  test('honours a custom points-per-day rate', () => {
    // 5 days * 10 = 50
    const custom = new AgeWeightedStrategy(10)
    const result = custom.evaluate(
      { status: 'active', createdAt: daysAgo(5) },
      NOW
    )
    expect(result.score).toBe(50)
    expect(result.level).toBe('high')
  })
})
