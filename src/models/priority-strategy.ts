import { Item } from '@/models/item'

/**
 * Discrete priority levels an item can be assigned.
 *
 * Ordered from most to least urgent: 'critical', 'high', 'medium', 'low'.
 */
export type PriorityLevel = 'critical' | 'high' | 'medium' | 'low'

/**
 * The minimal item shape a priority strategy needs to produce a score.
 *
 * This is intentionally looser than {@link Item} so strategies can be exercised
 * with partial records (e.g. in tests) and can accept `createdAt` as a string,
 * `Date`, or epoch-millis number without callers having to normalize first.
 */
export type PriorityInput = Pick<Partial<Item>, 'status'> & {
  createdAt?: string | number | Date
}

/**
 * The outcome of evaluating an item's priority.
 */
export interface PriorityResult {
  /**
   * The bucketed priority level derived from {@link PriorityResult.score}.
   */
  level: PriorityLevel

  /**
   * The raw numeric score the strategy computed before bucketing.
   */
  score: number

  /**
   * Human-readable explanations of the factors that contributed to the score.
   * Useful for debugging, auditing, and surfacing "why" in a UI.
   */
  reasons: string[]
}

/**
 * A pluggable strategy for computing the priority of an item.
 *
 * Implementations decide how status, age, and any other signals combine into a
 * score. Mapping a score onto a {@link PriorityLevel} is shared across
 * strategies (see `scoreToLevel`) so that levels stay comparable regardless of
 * which strategy produced the score.
 *
 * @example
 * const strategy: PriorityStrategy = createPriorityStrategy('age-weighted')
 * const result = strategy.evaluate({ status: 'urgent', createdAt: someDate })
 * console.log(result.level, result.score, result.reasons)
 */
export interface PriorityStrategy {
  /**
   * Stable, human-readable identifier for the strategy (e.g. 'status-weighted').
   */
  readonly name: string

  /**
   * Evaluate an item and return its priority level, raw score, and reasons.
   *
   * @param item - The item (or partial item) to evaluate
   * @param now - The reference time used for age calculations (defaults to `new Date()`).
   *              Injectable so tests are deterministic.
   */
  evaluate(item: PriorityInput, now?: Date): PriorityResult
}

/**
 * The set of built-in strategy identifiers understood by the factory.
 *
 * Additional strategies can be registered at runtime via
 * `registerPriorityStrategy`, so this type documents the built-ins rather than
 * an exhaustive, closed universe.
 */
export type PriorityStrategyKind = 'status-weighted' | 'age-weighted'
