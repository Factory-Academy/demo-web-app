import { Item } from '@/models/item'
import { appConfig, PriorityLevel } from '@/config/app-config'

export class ItemService {
  calculatePriority(record: Item): PriorityLevel {
    const ageScoring = appConfig.ageScoring
    const thresholds = appConfig.priorityThresholds

    // Use UTC dates to avoid timezone issues in day calculation
    const now = new Date()
    const created = new Date(record.createdAt)
    const nowUTC = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
    const createdUTC = Date.UTC(created.getUTCFullYear(), created.getUTCMonth(), created.getUTCDate())
    const ageDays = Math.floor((nowUTC - createdUTC) / ageScoring.MILLISECONDS_PER_DAY)
    let baseScore = 0

    if (record.status === appConfig.itemStatus.URGENT) {
      baseScore += ageScoring.URGENT_BASE_SCORE
    }
    if (ageDays > ageScoring.THRESHOLD_DAYS) {
      baseScore += ageDays * ageScoring.MULTIPLIER
    }

    if (baseScore >= thresholds.CRITICAL) return appConfig.priorityLevel.CRITICAL
    if (baseScore >= thresholds.HIGH) return appConfig.priorityLevel.HIGH
    if (baseScore >= thresholds.MEDIUM) return appConfig.priorityLevel.MEDIUM
    return appConfig.priorityLevel.LOW
  }

  /**
   * Validates partial item input and returns any validation errors.
   *
   * @example
   * // Returns: { valid: false, errors: ['Invalid status'] }
   * const result = new ItemService().validate({ name: 'Draft item', status: 'archived' })
   */
  validate(data: Partial<Item>): { valid: boolean; errors: string[] } {
    const errors: string[] = []
    if (!data.name?.trim()) errors.push('Name is required')
    if (data.status && !appConfig.validItemStatuses.includes(data.status as any)) {
      errors.push('Invalid status')
    }
    return { valid: errors.length === 0, errors }
  }
}
