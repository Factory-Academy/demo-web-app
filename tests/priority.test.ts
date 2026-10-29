import { Item } from '../src/models/item'
import {
  ageInDays,
  AgeWeightedStrategy,
  StatusWeightedStrategy,
  availableStrategies,
  createPriorityStrategy,
  DEFAULT_PRIORITY_STRATEGY,
  normalizeScore,
  PRIORITY_THRESHOLDS,
  PriorityStrategyKey,
  scoreToLevel,
} from '../src/services/priority'
import { ItemService } from '../src/services/item-service'

const MS_PER_DAY = 86_400_000
const NOW = Date.UTC(2026, 0, 1) // fixed clock keeps age-based scoring deterministic

function daysAgo(days: number): string {
  return new Date(NOW - days * MS_PER_DAY).toISOString()
}

function makeItem(overrides: Partial<Item> = {}): Item {
  return {
    id: '1',
    name: 'Sample',
    status: 'active',
    createdAt: daysAgo(0),
    updatedAt: daysAgo(0),
    ...overrides,
  }
}

describe('ageInDays', () => {
  test('returns whole days, floored', () => {
    const createdAt = new Date(NOW - (3 * MS_PER_DAY + MS_PER_DAY / 2)).toISOString()
    expect(ageInDays(createdAt, NOW)).toBe(3)
  })

  test('returns 0 for an unparseable timestamp', () => {
    expect(ageInDays('not-a-date', NOW)).toBe(0)
  })

  test('returns 0 for records dated in the future', () => {
    expect(ageInDays(daysAgo(-5), NOW)).toBe(0)
  })

  test('returns 0 at the exact reference instant', () => {
    expect(ageInDays(daysAgo(0), NOW)).toBe(0)
  })
})

describe('scoreToLevel / normalizeScore', () => {
  test('maps scores to the expected bands', () => {
    expect(scoreToLevel(80)).toBe('critical')
    expect(scoreToLevel(79.9)).toBe('high')
    expect(scoreToLevel(50)).toBe('high')
    expect(scoreToLevel(49.9)).toBe('medium')
    expect(scoreToLevel(20)).toBe('medium')
    expect(scoreToLevel(19.9)).toBe('low')
    expect(scoreToLevel(0)).toBe('low')
  })

  test('treats invalid or negative scores as the lowest band', () => {
    expect(scoreToLevel(Number.NaN)).toBe('low')
    expect(scoreToLevel(-100)).toBe('low')
    expect(normalizeScore(Number.POSITIVE_INFINITY)).toBe(0)
    expect(normalizeScore(-1)).toBe(0)
    expect(normalizeScore(42)).toBe(42)
  })

  test('thresholds are ordered high to low', () => {
    const mins = PRIORITY_THRESHOLDS.map((t) => t.min)
    const sorted = [...mins].sort((a, b) => b - a)
    expect(mins).toEqual(sorted)
  })
})

describe('AgeWeightedStrategy', () => {
  const strategy = new AgeWeightedStrategy()

  test('exposes a stable key and label', () => {
    expect(strategy.key).toBe('age-weighted')
    expect(strategy.label).toBe('Age-weighted')
  })

  test('gives urgent records a flat boost', () => {
    expect(strategy.score(makeItem({ status: 'urgent' }), { now: NOW })).toBe(50)
  })

  test('ignores age at or below the 30-day threshold', () => {
    expect(strategy.score(makeItem({ createdAt: daysAgo(30) }), { now: NOW })).toBe(0)
  })

  test('accrues weight for records older than 30 days', () => {
    expect(strategy.score(makeItem({ createdAt: daysAgo(100) }), { now: NOW })).toBe(50)
  })

  test('combines urgency and age', () => {
    const score = strategy.score(makeItem({ status: 'urgent', createdAt: daysAgo(64) }), {
      now: NOW,
    })
    expect(score).toBe(82)
  })
})

describe('StatusWeightedStrategy', () => {
  const strategy = new StatusWeightedStrategy()

  test('exposes a stable key and label', () => {
    expect(strategy.key).toBe('status-weighted')
    expect(strategy.label).toBe('Status-weighted')
  })

  test('scores known statuses from a baseline table', () => {
    expect(strategy.score(makeItem({ status: 'urgent' }), { now: NOW })).toBe(70)
    expect(strategy.score(makeItem({ status: 'pending' }), { now: NOW })).toBe(35)
    expect(strategy.score(makeItem({ status: 'active' }), { now: NOW })).toBe(15)
    expect(strategy.score(makeItem({ status: 'completed' }), { now: NOW })).toBe(0)
  })

  test('falls back to a default weight for unknown statuses', () => {
    expect(strategy.score(makeItem({ status: 'archived' }), { now: NOW })).toBe(10)
  })

  test('caps the age contribution so stale records cannot outrank status', () => {
    const urgentFresh = strategy.score(makeItem({ status: 'urgent' }), { now: NOW })
    const pendingAncient = strategy.score(
      makeItem({ status: 'pending', createdAt: daysAgo(100000) }),
      { now: NOW },
    )
    expect(pendingAncient).toBe(60) // 35 + capped 25
    expect(pendingAncient).toBeLessThan(urgentFresh + 25)
    expect(urgentFresh).toBeGreaterThan(pendingAncient)
  })
})

describe('createPriorityStrategy', () => {
  test('resolves each registered key', () => {
    expect(createPriorityStrategy('age-weighted').key).toBe('age-weighted')
    expect(createPriorityStrategy('status-weighted').key).toBe('status-weighted')
  })

  test('defaults to the age-weighted strategy', () => {
    expect(createPriorityStrategy().key).toBe(DEFAULT_PRIORITY_STRATEGY)
    expect(DEFAULT_PRIORITY_STRATEGY).toBe('age-weighted')
  })

  test('returns a fresh, independent instance each call', () => {
    const a = createPriorityStrategy('age-weighted')
    const b = createPriorityStrategy('age-weighted')
    expect(a).not.toBe(b)
  })

  test('throws on an unknown key', () => {
    expect(() => createPriorityStrategy('nope' as PriorityStrategyKey)).toThrow(
      'Unknown priority strategy: nope',
    )
  })

  test('lists all available strategies', () => {
    expect(availableStrategies().sort()).toEqual(['age-weighted', 'status-weighted'])
  })
})

describe('ItemService.calculatePriority', () => {
  test('preserves the original age-weighted behaviour by default', () => {
    const service = new ItemService()
    expect(service.calculatePriority(makeItem({ status: 'urgent' }), NOW)).toBe('high')
    expect(service.calculatePriority(makeItem({ createdAt: daysAgo(100) }), NOW)).toBe('high')
    expect(service.calculatePriority(makeItem({ createdAt: daysAgo(50) }), NOW)).toBe('medium')
    expect(service.calculatePriority(makeItem(), NOW)).toBe('low')
    expect(
      service.calculatePriority(makeItem({ status: 'urgent', createdAt: daysAgo(64) }), NOW),
    ).toBe('critical')
  })

  test('accepts a strategy key to swap scoring', () => {
    const service = new ItemService('status-weighted')
    expect(service.calculatePriority(makeItem({ status: 'pending' }), NOW)).toBe('medium')
    expect(service.calculatePriority(makeItem({ status: 'urgent' }), NOW)).toBe('high')
  })

  test('accepts a strategy instance for injection', () => {
    const service = new ItemService(new StatusWeightedStrategy())
    expect(service.calculatePriority(makeItem({ status: 'active' }), NOW)).toBe('low')
  })

  test('is deterministic when a clock is injected', () => {
    const service = new ItemService()
    const item = makeItem({ createdAt: daysAgo(40) })
    expect(service.calculatePriority(item, NOW)).toBe(service.calculatePriority(item, NOW))
  })
})
