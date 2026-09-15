import {
  PriorityStrategy,
  PriorityStrategyKind,
} from '@/models/priority-strategy'
import {
  AgeWeightedStrategy,
  StatusWeightedStrategy,
} from '@/services/priority-strategies'

/**
 * The strategy the factory produces when no kind is specified.
 *
 * Defaults to 'status-weighted' so that callers relying on the historical
 * priority behaviour get it without opting in.
 */
export const DEFAULT_PRIORITY_STRATEGY: PriorityStrategyKind = 'status-weighted'

/**
 * A zero-argument constructor for a strategy. The registry stores builders
 * rather than singletons so each call to the factory returns an independent
 * instance (strategies are cheap and this avoids accidental shared state).
 */
type StrategyBuilder = () => PriorityStrategy

const registry = new Map<string, StrategyBuilder>([
  ['status-weighted', () => new StatusWeightedStrategy()],
  ['age-weighted', () => new AgeWeightedStrategy()],
])

/**
 * Registers (or overrides) a strategy builder under the given kind.
 *
 * This is what makes the factory genuinely pluggable: new strategies can be
 * added at runtime without editing this module.
 *
 * @param kind - The identifier to register the builder under
 * @param build - A builder that returns a fresh strategy instance
 *
 * @example
 * registerPriorityStrategy('sla-weighted', () => new SlaWeightedStrategy())
 * const strategy = createPriorityStrategy('sla-weighted')
 */
export function registerPriorityStrategy(
  kind: string,
  build: StrategyBuilder
): void {
  registry.set(kind, build)
}

/**
 * Lists the strategy kinds currently known to the factory.
 *
 * @returns A snapshot array of registered kind identifiers
 */
export function availableStrategies(): string[] {
  return Array.from(registry.keys())
}

/**
 * Creates a priority strategy instance for the requested kind.
 *
 * @param kind - The strategy identifier (defaults to {@link DEFAULT_PRIORITY_STRATEGY})
 * @returns A fresh strategy instance
 * @throws {Error} If the kind has not been registered. The message lists the
 *   available kinds to aid debugging.
 *
 * @example
 * const strategy = createPriorityStrategy('age-weighted')
 * const { level } = strategy.evaluate(item)
 */
export function createPriorityStrategy(
  kind: string = DEFAULT_PRIORITY_STRATEGY
): PriorityStrategy {
  const build = registry.get(kind)
  if (!build) {
    throw new Error(
      `Unknown priority strategy '${kind}'. ` +
        `Available strategies: ${availableStrategies().join(', ')}.`
    )
  }
  return build()
}
