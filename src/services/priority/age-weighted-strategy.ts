import { Item } from '@/models/item'
import { ageInDays } from './age'
import { PriorityContext, PriorityStrategy } from './types'

const URGENT_WEIGHT = 50
const AGE_THRESHOLD_DAYS = 30
const AGE_WEIGHT_PER_DAY = 0.5

/**
 * Original scoring: urgent records get a flat boost, and records older than a
 * month accrue weight linearly with age. Preserves the behaviour that shipped
 * in `ItemService.calculatePriority` before strategies were extracted.
 */
export class AgeWeightedStrategy implements PriorityStrategy {
  readonly key = 'age-weighted'
  readonly label = 'Age-weighted'

  score(record: Item, context: PriorityContext = {}): number {
    const now = context.now ?? Date.now()
    let score = 0

    if (record.status === 'urgent') score += URGENT_WEIGHT

    const ageDays = ageInDays(record.createdAt, now)
    if (ageDays > AGE_THRESHOLD_DAYS) score += ageDays * AGE_WEIGHT_PER_DAY

    return score
  }
}
