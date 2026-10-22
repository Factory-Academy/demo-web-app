import { Item } from '@/models/item'
import { ageInDays } from './age'
import { PriorityLevel, PriorityResult, PriorityStrategy, ScoringContext } from './types'

/**
 * Tunable knobs for {@link WeightedScoreStrategy}. The defaults reproduce the
 * original `ItemService.calculatePriority` behaviour exactly, so swapping the
 * hard-coded method for this strategy is a no-op for existing callers.
 */
export interface WeightedStrategyOptions {
  /** Points added when `status === 'urgent'`. */
  urgentBonus: number
  /** Aging only contributes once an item is older than this many days. */
  agingThresholdDays: number
  /** Points added per day of age, once past {@link agingThresholdDays}. */
  agingPerDay: number
  /**
   * Inclusive lower bounds mapping the accumulated score to a level. Must be
   * ordered `critical >= high >= medium`; anything below `medium` is `low`.
   */
  thresholds: {
    critical: number
    high: number
    medium: number
  }
}

export const DEFAULT_WEIGHTED_OPTIONS: WeightedStrategyOptions = {
  urgentBonus: 50,
  agingThresholdDays: 30,
  agingPerDay: 0.5,
  thresholds: {
    critical: 80,
    high: 50,
    medium: 20,
  },
}

/**
 * Additive scoring: each signal contributes points, and the total is bucketed
 * against a set of thresholds. This mirrors the original algorithm and is easy
 * to extend — new signals just add more points — at the cost of thresholds
 * that must be re-tuned whenever the weights change.
 */
export class WeightedScoreStrategy implements PriorityStrategy {
  readonly name = 'weighted'
  private readonly options: WeightedStrategyOptions

  constructor(options?: Partial<WeightedStrategyOptions>) {
    const merged: WeightedStrategyOptions = {
      ...DEFAULT_WEIGHTED_OPTIONS,
      ...options,
      thresholds: {
        ...DEFAULT_WEIGHTED_OPTIONS.thresholds,
        ...options?.thresholds,
      },
    }

    const { critical, high, medium } = merged.thresholds
    if (!(critical >= high && high >= medium)) {
      throw new RangeError(
        `thresholds must be ordered critical >= high >= medium, got ` +
          `${critical} / ${high} / ${medium}`,
      )
    }
    if (merged.agingThresholdDays < 0) {
      throw new RangeError('agingThresholdDays must be >= 0')
    }

    this.options = merged
  }

  score(item: Item, context?: ScoringContext): PriorityResult {
    const o = this.options
    const reasons: string[] = []
    let score = 0

    if (item.status === 'urgent') {
      score += o.urgentBonus
      reasons.push(`status=urgent (+${o.urgentBonus})`)
    }

    const ageDays = ageInDays(item, context)
    if (ageDays > o.agingThresholdDays) {
      const agingPoints = ageDays * o.agingPerDay
      score += agingPoints
      reasons.push(
        `aged ${ageDays}d (> ${o.agingThresholdDays}d, +${agingPoints})`,
      )
    }

    if (reasons.length === 0) {
      reasons.push('no priority signals')
    }

    return { level: this.toLevel(score), score, reasons }
  }

  private toLevel(score: number): PriorityLevel {
    const { critical, high, medium } = this.options.thresholds
    if (score >= critical) return 'critical'
    if (score >= high) return 'high'
    if (score >= medium) return 'medium'
    return 'low'
  }
}
