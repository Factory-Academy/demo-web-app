import {
  availableStrategies,
  createPriorityStrategy,
  registerPriorityStrategy,
} from '@/lib/priority/factory'
import { WeightedScoreStrategy } from '@/lib/priority/weighted-strategy'
import { ThresholdStrategy } from '@/lib/priority/threshold-strategy'
import { PriorityStrategy } from '@/lib/priority/types'
import { Item } from '@/models/item'

function item(status = 'active'): Item {
  return { id: '1', name: 'x', status, createdAt: '', updatedAt: '' }
}

describe('createPriorityStrategy', () => {
  test('builds the built-in weighted strategy', () => {
    const strategy = createPriorityStrategy('weighted')
    expect(strategy).toBeInstanceOf(WeightedScoreStrategy)
    expect(strategy.name).toBe('weighted')
  })

  test('builds the built-in threshold strategy', () => {
    const strategy = createPriorityStrategy('threshold')
    expect(strategy).toBeInstanceOf(ThresholdStrategy)
    expect(strategy.name).toBe('threshold')
  })

  test('passes options through to the built-in strategy', () => {
    const strategy = createPriorityStrategy('weighted', { urgentBonus: 5 })
    const result = strategy.score(item('urgent'), { now: Date.now() })
    expect(result.score).toBe(5)
  })

  test('lists the built-in strategies', () => {
    expect(availableStrategies()).toEqual(
      expect.arrayContaining(['weighted', 'threshold']),
    )
  })

  test('throws a helpful error for an unknown kind', () => {
    expect(() => createPriorityStrategy('nope')).toThrow(/unknown priority strategy/)
  })

  test('supports registering and building a custom strategy', () => {
    const alwaysCritical: PriorityStrategy = {
      name: 'always-critical',
      score: () => ({ level: 'critical', score: 999, reasons: ['custom'] }),
    }
    registerPriorityStrategy('always-critical', () => alwaysCritical)

    expect(availableStrategies()).toContain('always-critical')
    const built = createPriorityStrategy('always-critical')
    expect(built.score(item()).level).toBe('critical')
  })

  test('rejects registering under an empty kind', () => {
    expect(() => registerPriorityStrategy('  ', () => createPriorityStrategy('weighted'))).toThrow(
      RangeError,
    )
  })
})
