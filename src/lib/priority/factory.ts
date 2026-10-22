import { PriorityStrategy } from './types'
import {
  WeightedScoreStrategy,
  WeightedStrategyOptions,
} from './weighted-strategy'
import {
  ThresholdStrategy,
  ThresholdStrategyOptions,
} from './threshold-strategy'

/** Built-in strategy identifiers. */
export type BuiltInStrategyKind = 'weighted' | 'threshold'

/** A builder that turns (optional) options into a strategy instance. */
export type StrategyBuilder = (options?: unknown) => PriorityStrategy

// A module-level registry is what makes the factory "pluggable": callers can
// register their own strategies under a new key and build them through the
// same entry point as the built-ins.
const registry = new Map<string, StrategyBuilder>()

/**
 * Register (or replace) a strategy builder under `kind`. Returned so a custom
 * strategy can be registered and used in a single expression.
 */
export function registerPriorityStrategy(
  kind: string,
  builder: StrategyBuilder,
): void {
  if (!kind.trim()) {
    throw new RangeError('strategy kind must be a non-empty string')
  }
  registry.set(kind, builder)
}

/** Names of every currently registered strategy, in insertion order. */
export function availableStrategies(): string[] {
  // `Array.from` (not spread) so this works under the ES5 compile target,
  // where spreading a Map iterator without `downlevelIteration` silently
  // yields an empty array.
  return Array.from(registry.keys())
}

/**
 * Build a strategy by name. Overloads give precise option typing for the
 * built-ins while still allowing lookup of custom-registered strategies.
 *
 * @throws RangeError if `kind` is not registered.
 */
export function createPriorityStrategy(
  kind: 'weighted',
  options?: Partial<WeightedStrategyOptions>,
): PriorityStrategy
export function createPriorityStrategy(
  kind: 'threshold',
  options?: Partial<ThresholdStrategyOptions>,
): PriorityStrategy
export function createPriorityStrategy(
  kind: string,
  options?: unknown,
): PriorityStrategy
export function createPriorityStrategy(
  kind: string,
  options?: unknown,
): PriorityStrategy {
  const builder = registry.get(kind)
  if (!builder) {
    throw new RangeError(
      `unknown priority strategy "${kind}"; available: ` +
        `${availableStrategies().join(', ')}`,
    )
  }
  return builder(options)
}

registerPriorityStrategy(
  'weighted',
  (options) =>
    new WeightedScoreStrategy(options as Partial<WeightedStrategyOptions>),
)
registerPriorityStrategy(
  'threshold',
  (options) =>
    new ThresholdStrategy(options as Partial<ThresholdStrategyOptions>),
)
