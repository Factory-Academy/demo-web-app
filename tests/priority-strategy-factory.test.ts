import {
  DEFAULT_PRIORITY_STRATEGY,
  availableStrategies,
  createPriorityStrategy,
  registerPriorityStrategy,
} from '../src/services/priority-strategy-factory'
import {
  AgeWeightedStrategy,
  StatusWeightedStrategy,
} from '../src/services/priority-strategies'
import { PriorityInput, PriorityStrategy } from '../src/models/priority-strategy'

describe('createPriorityStrategy', () => {
  test('returns the status-weighted strategy by default', () => {
    const strategy = createPriorityStrategy()
    expect(strategy).toBeInstanceOf(StatusWeightedStrategy)
    expect(strategy.name).toBe(DEFAULT_PRIORITY_STRATEGY)
  })

  test('builds the requested built-in strategies', () => {
    expect(createPriorityStrategy('status-weighted')).toBeInstanceOf(
      StatusWeightedStrategy
    )
    expect(createPriorityStrategy('age-weighted')).toBeInstanceOf(
      AgeWeightedStrategy
    )
  })

  test('returns a fresh instance on each call', () => {
    const a = createPriorityStrategy('age-weighted')
    const b = createPriorityStrategy('age-weighted')
    expect(a).not.toBe(b)
  })

  test('throws a helpful error for an unknown kind', () => {
    expect(() => createPriorityStrategy('does-not-exist')).toThrow(
      /Unknown priority strategy 'does-not-exist'/
    )
  })

  test('the unknown-kind error lists the available strategies', () => {
    expect(() => createPriorityStrategy('does-not-exist')).toThrow(
      /Available strategies: .*status-weighted/
    )
  })

  test('trims surrounding whitespace before resolving a kind', () => {
    expect(createPriorityStrategy('  age-weighted  ')).toBeInstanceOf(
      AgeWeightedStrategy
    )
  })

  test('throws for an empty or blank kind', () => {
    expect(() => createPriorityStrategy('')).toThrow(/empty kind/)
    expect(() => createPriorityStrategy('   ')).toThrow(/empty kind/)
  })

  test('throws when a builder returns no strategy', () => {
    registerPriorityStrategy(
      'empty-builder',
      () => undefined as unknown as PriorityStrategy
    )
    expect(() => createPriorityStrategy('empty-builder')).toThrow(
      /returned no strategy/
    )
  })
})

describe('availableStrategies', () => {
  test('includes both built-in strategies', () => {
    const kinds = availableStrategies()
    expect(kinds).toContain('status-weighted')
    expect(kinds).toContain('age-weighted')
  })
})

describe('registerPriorityStrategy', () => {
  test('makes a custom strategy resolvable through the factory', () => {
    class ConstantStrategy implements PriorityStrategy {
      readonly name = 'constant'
      evaluate(_item: PriorityInput) {
        return { level: 'critical' as const, score: 999, reasons: ['constant'] }
      }
    }

    registerPriorityStrategy('constant', () => new ConstantStrategy())

    expect(availableStrategies()).toContain('constant')
    const strategy = createPriorityStrategy('constant')
    expect(strategy).toBeInstanceOf(ConstantStrategy)
    expect(strategy.evaluate({}).level).toBe('critical')
  })

  test('overrides an existing kind when re-registered', () => {
    const sentinel = new AgeWeightedStrategy()
    registerPriorityStrategy('override-me', () => sentinel)
    expect(createPriorityStrategy('override-me')).toBe(sentinel)

    const replacement = new StatusWeightedStrategy()
    registerPriorityStrategy('override-me', () => replacement)
    expect(createPriorityStrategy('override-me')).toBe(replacement)
  })

  test('trims the kind so registered and resolved names match', () => {
    const strategy = new StatusWeightedStrategy()
    registerPriorityStrategy('  padded-kind  ', () => strategy)
    expect(availableStrategies()).toContain('padded-kind')
    expect(createPriorityStrategy('padded-kind')).toBe(strategy)
  })

  test('rejects registering under an empty or blank kind', () => {
    expect(() =>
      registerPriorityStrategy('   ', () => new StatusWeightedStrategy())
    ).toThrow(/empty kind/)
  })

  test('rejects a non-function builder', () => {
    expect(() =>
      registerPriorityStrategy(
        'bad-builder',
        null as unknown as () => PriorityStrategy
      )
    ).toThrow(/must be a function/)
  })
})
