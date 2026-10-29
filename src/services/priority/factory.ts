import { AgeWeightedStrategy } from './age-weighted-strategy'
import { StatusWeightedStrategy } from './status-weighted-strategy'
import { PriorityStrategy } from './types'

export type PriorityStrategyKey = 'age-weighted' | 'status-weighted'

const REGISTRY: Readonly<Record<PriorityStrategyKey, () => PriorityStrategy>> = {
  'age-weighted': () => new AgeWeightedStrategy(),
  'status-weighted': () => new StatusWeightedStrategy(),
}

export const DEFAULT_PRIORITY_STRATEGY: PriorityStrategyKey = 'age-weighted'

/**
 * Resolve a strategy by key. Strategies are stateless, so a fresh instance per
 * call is cheap and avoids accidental sharing of mutable state.
 */
export function createPriorityStrategy(
  key: PriorityStrategyKey = DEFAULT_PRIORITY_STRATEGY,
): PriorityStrategy {
  const build = REGISTRY[key]
  if (!build) {
    throw new Error(`Unknown priority strategy: ${String(key)}`)
  }
  return build()
}

export function availableStrategies(): PriorityStrategyKey[] {
  return Object.keys(REGISTRY) as PriorityStrategyKey[]
}
