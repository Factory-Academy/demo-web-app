import {
  DEFAULT_THRESHOLD_RULES,
  ThresholdStrategy,
} from '@/lib/priority/threshold-strategy'
import { Item } from '@/models/item'

const DAY = 86_400_000
const NOW = Date.parse('2026-01-31T00:00:00.000Z')

function aged(days: number, status = 'active'): Item {
  return {
    id: '1',
    name: 'x',
    status,
    createdAt: new Date(NOW - days * DAY).toISOString(),
    updatedAt: new Date(NOW).toISOString(),
  }
}

describe('ThresholdStrategy', () => {
  const strategy = new ThresholdStrategy()

  test('reports its name', () => {
    expect(strategy.name).toBe('threshold')
  })

  test('urgent and aged > 30d is critical (first matching rule wins)', () => {
    const result = strategy.score(aged(31, 'urgent'), { now: NOW })
    expect(result.level).toBe('critical')
    expect(result.score).toBe(0)
    expect(result.reasons[0]).toContain('rule #0')
  })

  test('urgent but fresh is high', () => {
    const result = strategy.score(aged(1, 'urgent'), { now: NOW })
    expect(result.level).toBe('high')
    expect(result.score).toBe(1)
  })

  test('old but not urgent: > 60d is high, > 30d is medium', () => {
    expect(strategy.score(aged(61), { now: NOW }).level).toBe('high')
    expect(strategy.score(aged(45), { now: NOW }).level).toBe('medium')
  })

  test('nothing matches falls back to low', () => {
    const result = strategy.score(aged(5), { now: NOW })
    expect(result.level).toBe('low')
    expect(result.score).toBe(DEFAULT_THRESHOLD_RULES.length)
    expect(result.reasons[0]).toContain('fallback=low')
  })

  test('boundaries use strictly-greater-than semantics', () => {
    // Exactly 30d does not satisfy "> 30d".
    expect(strategy.score(aged(30), { now: NOW }).level).toBe('low')
    // Exactly 60d does not satisfy "> 60d" but does satisfy "> 30d".
    expect(strategy.score(aged(60), { now: NOW }).level).toBe('medium')
  })

  test('honours a custom rule set and fallback', () => {
    const custom = new ThresholdStrategy({
      rules: [
        {
          level: 'critical',
          label: 'always',
          when: () => true,
        },
      ],
      fallback: 'high',
    })
    expect(custom.score(aged(0), { now: NOW }).level).toBe('critical')
  })

  test('rejects an empty rule set', () => {
    expect(() => new ThresholdStrategy({ rules: [] })).toThrow(RangeError)
  })
})
