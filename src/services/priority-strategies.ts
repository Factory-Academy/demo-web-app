import {
  PriorityInput,
  PriorityResult,
  PriorityStrategy,
} from '@/models/priority-strategy'
import {
  ageInDays,
  normalizeStatus,
  scoreToLevel,
} from '@/services/priority-scoring'

/**
 * Status-weighted priority strategy.
 *
 * This preserves the original `ItemService.calculatePriority` behaviour so that
 * extracting the logic into a strategy is a behaviour-preserving refactor:
 *
 * - `urgent` status contributes a flat +50.
 * - Age only starts contributing after a 30-day grace period, at 0.5 points per
 *   day beyond the threshold.
 *
 * The effect is that status dominates and age is a slow-burning tie-breaker for
 * long-lived items.
 *
 * @example
 * const strategy = new StatusWeightedStrategy()
 * strategy.evaluate({ status: 'urgent', createdAt: new Date() }).level // 'high'
 */
export class StatusWeightedStrategy implements PriorityStrategy {
  readonly name = 'status-weighted'

  /**
   * @param urgentBonus - Points added when status is 'urgent' (default 50)
   * @param ageGraceDays - Days before age begins to contribute (default 30)
   * @param pointsPerAgingDay - Points per day beyond the grace period (default 0.5)
   */
  constructor(
    private readonly urgentBonus: number = 50,
    private readonly ageGraceDays: number = 30,
    private readonly pointsPerAgingDay: number = 0.5
  ) {}

  evaluate(item: PriorityInput, now: Date = new Date()): PriorityResult {
    const reasons: string[] = []
    let score = 0

    if (normalizeStatus(item.status) === 'urgent') {
      score += this.urgentBonus
      reasons.push(`status 'urgent' (+${this.urgentBonus})`)
    }

    const ageDays = ageInDays(item.createdAt, now)
    if (ageDays > this.ageGraceDays) {
      const agingPoints = ageDays * this.pointsPerAgingDay
      score += agingPoints
      reasons.push(
        `aged ${ageDays}d beyond ${this.ageGraceDays}d grace (+${agingPoints})`
      )
    }

    if (reasons.length === 0) {
      reasons.push('no elevating factors')
    }

    return { level: scoreToLevel(score), score, reasons }
  }
}

/**
 * Age-weighted priority strategy.
 *
 * An alternative weighting that emphasizes how long an item has been waiting,
 * with status acting as a modest boost rather than the dominant factor:
 *
 * - Age contributes linearly from day zero (2 points per day), with no grace
 *   period, so backlog items steadily rise in priority.
 * - `urgent` adds +20 and `pending` adds +10.
 *
 * This surfaces stale items that a status-first approach would leave at the
 * bottom of the queue.
 *
 * @example
 * const strategy = new AgeWeightedStrategy()
 * strategy.evaluate({ status: 'pending', createdAt: oldDate }).level // e.g. 'critical'
 */
export class AgeWeightedStrategy implements PriorityStrategy {
  readonly name = 'age-weighted'

  private static readonly STATUS_BONUS: Readonly<Record<string, number>> = {
    urgent: 20,
    pending: 10,
  }

  /**
   * @param pointsPerDay - Points accrued per day of age (default 2)
   */
  constructor(private readonly pointsPerDay: number = 2) {}

  evaluate(item: PriorityInput, now: Date = new Date()): PriorityResult {
    const reasons: string[] = []
    let score = 0

    const ageDays = ageInDays(item.createdAt, now)
    if (ageDays > 0) {
      const agingPoints = ageDays * this.pointsPerDay
      score += agingPoints
      reasons.push(`aged ${ageDays}d (+${agingPoints})`)
    }

    const status = normalizeStatus(item.status)
    const statusBonus = status
      ? AgeWeightedStrategy.STATUS_BONUS[status]
      : undefined
    if (statusBonus) {
      score += statusBonus
      reasons.push(`status '${status}' (+${statusBonus})`)
    }

    if (reasons.length === 0) {
      reasons.push('no elevating factors')
    }

    return { level: scoreToLevel(score), score, reasons }
  }
}
