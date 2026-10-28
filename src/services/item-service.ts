import { Item } from '@/models/item'
import {
  PRIORITY_LEVELS,
  PriorityLevel,
  PRIORITY_THRESHOLDS,
  ITEM_STATUSES,
  VALID_ITEM_STATUSES,
  PRIORITY_CALCULATION,
  VALIDATION_MESSAGES,
} from '@/config/constants'

export class ItemService {
  calculatePriority(record: Item): PriorityLevel {
    const ageMs = Date.now() - new Date(record.createdAt).getTime()
    const ageDays = Math.floor(ageMs / PRIORITY_CALCULATION.MS_PER_DAY)
    let baseScore = 0

    if (record.status === ITEM_STATUSES.URGENT) {
      baseScore += PRIORITY_CALCULATION.URGENT_SCORE
    }
    if (ageDays > PRIORITY_CALCULATION.AGE_THRESHOLD_DAYS) {
      baseScore += ageDays * PRIORITY_CALCULATION.AGE_SCORE_MULTIPLIER
    }

    if (baseScore >= PRIORITY_THRESHOLDS.CRITICAL) return PRIORITY_LEVELS.CRITICAL
    if (baseScore >= PRIORITY_THRESHOLDS.HIGH) return PRIORITY_LEVELS.HIGH
    if (baseScore >= PRIORITY_THRESHOLDS.MEDIUM) return PRIORITY_LEVELS.MEDIUM
    return PRIORITY_LEVELS.LOW
  }

  validate(data: Partial<Item>): { valid: boolean; errors: string[] } {
    const errors: string[] = []
    if (!data.name?.trim()) errors.push(VALIDATION_MESSAGES.NAME_REQUIRED)
    if (data.status && !VALID_ITEM_STATUSES.includes(data.status as any)) {
      errors.push(VALIDATION_MESSAGES.INVALID_STATUS)
    }
    return { valid: errors.length === 0, errors }
  }
}
