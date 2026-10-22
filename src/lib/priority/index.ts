/**
 * Pluggable priority-scoring toolkit.
 *
 * A {@link PriorityStrategy} turns an {@link Item} into a {@link PriorityLevel}.
 * Build one through {@link createPriorityStrategy} (or register your own via
 * {@link registerPriorityStrategy}) and inject it into `ItemService`.
 */

export {
  type PriorityLevel,
  type ScoringContext,
  type PriorityResult,
  type PriorityStrategy,
  PRIORITY_LEVELS,
} from './types'

export { ageInDays } from './age'

export {
  type WeightedStrategyOptions,
  DEFAULT_WEIGHTED_OPTIONS,
  WeightedScoreStrategy,
} from './weighted-strategy'

export {
  type PriorityRule,
  type ThresholdStrategyOptions,
  DEFAULT_THRESHOLD_RULES,
  ThresholdStrategy,
} from './threshold-strategy'

export {
  type BuiltInStrategyKind,
  type StrategyBuilder,
  registerPriorityStrategy,
  availableStrategies,
  createPriorityStrategy,
} from './factory'
