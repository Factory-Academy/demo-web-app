import { Item } from '@/models/item'
import { appConfig, PriorityLevel } from '@/config/app-config'

export class ItemService {
  calculatePriority(record: Item): PriorityLevel {
    const ageScoring = appConfig.ageScoring
    const thresholds = appConfig.priorityThresholds

    const ageMs = Date.now() - new Date(record.createdAt).getTime()
    const ageDays = Math.floor(ageMs / ageScoring.MILLISECONDS_PER_DAY)
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

  validate(data: Partial<Item>): { valid: boolean; errors: string[] } {
    const errors: string[] = []
    if (!data.name?.trim()) errors.push('Name is required')
    if (data.status && !appConfig.validItemStatuses.includes(data.status as any)) {
      errors.push('Invalid status')
    }
    return { valid: errors.length === 0, errors }
  }
}
