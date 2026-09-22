import { Item } from '@/models/item'
import { appConfig, PriorityLevel } from '@/config/app-config'
import { LRUCache } from '@/utils/lru-cache'

export interface ItemServiceOptions {
  priorityCache?: LRUCache<string, PriorityLevel>
}

export class ItemService {
  private priorityCache?: LRUCache<string, PriorityLevel>

  constructor(options?: ItemServiceOptions) {
    this.priorityCache = options?.priorityCache
  }

  calculatePriority(record: Item): PriorityLevel {
    // Check cache first
    const cacheKey = `${record.id}:${record.status}:${record.createdAt}`
    if (this.priorityCache) {
      const cached = this.priorityCache.get(cacheKey)
      if (cached !== undefined) {
        return cached
      }
    }
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

    let priority: PriorityLevel
    if (baseScore >= thresholds.CRITICAL) priority = appConfig.priorityLevel.CRITICAL
    else if (baseScore >= thresholds.HIGH) priority = appConfig.priorityLevel.HIGH
    else if (baseScore >= thresholds.MEDIUM) priority = appConfig.priorityLevel.MEDIUM
    else priority = appConfig.priorityLevel.LOW

    // Store in cache
    if (this.priorityCache) {
      this.priorityCache.set(cacheKey, priority)
    }

    return priority
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
