import { Item } from '@/models/item'
import { ageInDays } from './age'
import { PriorityContext, PriorityStrategy } from './types'

const STATUS_WEIGHTS: Readonly<Record<string, number>> = {
  urgent: 70,
  pending: 35,
  active: 15,
  completed: 0,
}
const DEFAULT_STATUS_WEIGHT = 10
const AGE_WEIGHT_PER_DAY = 0.4
const AGE_CONTRIBUTION_CAP = 25

/**
 * Status-first scoring: the record's status sets the baseline and age is only a
 * bounded tie-breaker. Unlike the age-weighted strategy, a stale record can
 * never outrank an urgent one, which suits backlogs where freshness matters
 * less than declared state.
 */
export class StatusWeightedStrategy implements PriorityStrategy {
  readonly key = 'status-weighted'
  readonly label = 'Status-weighted'

  score(record: Item, context: PriorityContext = {}): number {
    const now = context.now ?? Date.now()
    const statusScore = STATUS_WEIGHTS[record.status] ?? DEFAULT_STATUS_WEIGHT

    const ageDays = ageInDays(record.createdAt, now)
    const ageScore = Math.min(AGE_CONTRIBUTION_CAP, ageDays * AGE_WEIGHT_PER_DAY)

    return statusScore + ageScore
  }
}
