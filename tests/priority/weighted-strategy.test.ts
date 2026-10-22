import {
  DEFAULT_WEIGHTED_OPTIONS,
  WeightedScoreStrategy,
} from '@/lib/priority/weighted-strategy'
import { Item } from '@/models/item'

const DAY = 86_400_000
const NOW = Date.parse('2026-01-31T00:00:00.000Z')

function item(overrides: Partial<Item> = {}): Item {
  return {
    id: '1',
    name: 'x',
    status: 'active',
    createdAt: new Date(NOW).toISOString(),
    updatedAt: new Date(NOW).toISOString(),
    ...overrides,
  }
}

function aged(days: number, overrides: Partial<Item> = {}): Item {
  return item({ createdAt: new Date(NOW - days * DAY).toISOString(), ...overrides })
}

describe('WeightedScoreStrategy', () => {
  const strategy = new WeightedScoreStrategy()

  test('reports its name', () => {
    expect(strategy.name).toBe('weighted')
  })

  test('a fresh, non-urgent item is low with a zero score', () => {
    const result = strategy.score(item(), { now: NOW })
    expect(result.level).toBe('low')
    expect(result.score).toBe(0)
    expect(result.reasons).toEqual(['no priority signals'])
  })

  test('urgent alone reaches high (50 >= 50)', () => {
    const result = strategy.score(item({ status: 'urgent' }), { now: NOW })
    expect(result.score).toBe(50)
    expect(result.level).toBe('high')
  })

  test('aging below the threshold contributes nothing', () => {
    // 30d is not strictly greater than the 30d threshold.
    const result = strategy.score(aged(30), { now: NOW })
    expect(result.score).toBe(0)
    expect(result.level).toBe('low')
  })

  test('aging alone can reach medium', () => {
    // 50d * 0.5 = 25 >= 20 (medium), < 50 (high).
    const result = strategy.score(aged(50), { now: NOW })
    expect(result.score).toBe(25)
    expect(result.level).toBe('medium')
  })

  test('urgent plus heavy aging reaches critical', () => {
    // 50 (urgent) + 60d * 0.5 = 80 >= 80 (critical).
    const result = strategy.score(aged(60, { status: 'urgent' }), { now: NOW })
    expect(result.score).toBe(80)
    expect(result.level).toBe('critical')
    expect(result.reasons).toHaveLength(2)
  })

  test('matches the original calculatePriority behaviour across a matrix', () => {
    const cases: Array<{ days: number; urgent: boolean; expected: string }> = [
      { days: 0, urgent: false, expected: 'low' },
      { days: 50, urgent: false, expected: 'medium' }, // 50 * 0.5 = 25 pts
      { days: 100, urgent: false, expected: 'high' }, // 100 * 0.5 = 50 pts
      { days: 0, urgent: true, expected: 'high' }, // 50 pts
      { days: 59, urgent: true, expected: 'high' }, // 50 + 29.5 = 79.5
      { days: 60, urgent: true, expected: 'critical' }, // 50 + 30 = 80
    ]
    for (const c of cases) {
      const result = strategy.score(
        aged(c.days, { status: c.urgent ? 'urgent' : 'active' }),
        { now: NOW },
      )
      expect(result.level).toBe(c.expected)
    }
  })

  test('honours custom weights and thresholds', () => {
    const custom = new WeightedScoreStrategy({
      urgentBonus: 10,
      thresholds: { critical: 100, high: 10, medium: 5 },
    })
    const result = custom.score(item({ status: 'urgent' }), { now: NOW })
    expect(result.score).toBe(10)
    expect(result.level).toBe('high')
  })

  test('rejects misordered thresholds', () => {
    expect(
      () => new WeightedScoreStrategy({ thresholds: { critical: 10, high: 50, medium: 20 } }),
    ).toThrow(RangeError)
  })

  test('rejects a negative aging threshold', () => {
    expect(() => new WeightedScoreStrategy({ agingThresholdDays: -1 })).toThrow(
      RangeError,
    )
  })

  test('exposes defaults that reproduce the legacy constants', () => {
    expect(DEFAULT_WEIGHTED_OPTIONS.urgentBonus).toBe(50)
    expect(DEFAULT_WEIGHTED_OPTIONS.thresholds.critical).toBe(80)
  })
})
