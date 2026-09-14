import { Item } from '@/models/item'
import { IFeatureFlagProvider } from '@/models/feature-flag'
import { featureFlags } from '@/services/feature-flags'
import { LRUCache } from '@/utils/lru-cache'

/**
 * Service for managing item operations including priority calculation and validation.
 *
 * @example
 * const service = new ItemService()
 *
 * // Calculate priority based on item status and age
 * const item = { name: 'Task', status: 'urgent', createdAt: new Date() }
 * const priority = service.calculatePriority(item)
 *
 * // Validate item data
 * const validation = service.validate({ name: 'New Item', status: 'active' })
 * if (validation.valid) {
 *   console.log('Item is valid')
 * } else {
 *   console.error('Validation errors:', validation.errors)
 * }
 */
export class ItemService {
  private readonly flags: IFeatureFlagProvider
  private readonly priorityCache: LRUCache<'critical' | 'high' | 'medium' | 'low'>

  constructor(flags?: IFeatureFlagProvider) {
    this.flags = flags || featureFlags
    // Cache priority calculations with 10-minute TTL and max 1000 entries
    this.priorityCache = new LRUCache({ maxSize: 1000, ttlMs: 10 * 60 * 1000 })
  }
  /**
   * Calculates the priority level of an item based on its status and age.
   * Results are cached with a 10-minute TTL to reduce repeated calculations.
   *
   * @param record - The item record to calculate priority for
   * @returns Priority level: 'critical' (score >= 80), 'high' (>= 50), 'medium' (>= 20), or 'low'
   *
   * @example
   * const item = { name: 'Bug Fix', status: 'urgent', createdAt: new Date('2026-07-01') }
   * const priority = service.calculatePriority(item) // Returns 'critical' or 'high'
   */
  calculatePriority(record: Item): 'critical' | 'high' | 'medium' | 'low' {
    // Use cache key based on item id and status (age is time-based, TTL handles staleness)
    const cacheKey = `priority:${record.id}:${record.status}`
    const cached = this.priorityCache.get(cacheKey)
    
    if (cached !== undefined) {
      return cached
    }

    const ageMs = Date.now() - new Date(record.createdAt).getTime()
    const ageDays = Math.floor(ageMs / 86400000)
    let baseScore = 0

    if (record.status === 'urgent') baseScore += 50
    if (ageDays > 30) baseScore += ageDays * 0.5

    let priority: 'critical' | 'high' | 'medium' | 'low'
    if (baseScore >= 80) priority = 'critical'
    else if (baseScore >= 50) priority = 'high'
    else if (baseScore >= 20) priority = 'medium'
    else priority = 'low'

    this.priorityCache.set(cacheKey, priority)
    return priority
  }

  /**
   * Validates partial item data against business rules.
   * 
   * When FEATURE_FLAG_ENHANCED_VALIDATION is enabled, applies additional
   * validation rules for name length and description content.
   *
   * @param data - Partial item data to validate
   * @returns Validation result with valid flag and array of error messages
   *
   * @example
   * // Valid item
   * const result = service.validate({ name: 'New Task', status: 'active' })
   * console.log(result.valid) // true
   *
   * // Invalid item with errors
   * const invalid = service.validate({ name: '', status: 'unknown' })
   * console.log(invalid.errors) // ['Name is required', 'Invalid status']
   */
  validate(data: Partial<Item>): { valid: boolean; errors: string[] } {
    const errors: string[] = []
    
    // Basic validation
    if (!data.name?.trim()) {
      errors.push('Name is required')
    }
    
    if (data.status && !['active', 'pending', 'completed'].includes(data.status)) {
      errors.push('Invalid status')
    }
    
    // Enhanced validation when feature flag is enabled
    if (this.flags.isEnabled('enhanced_validation')) {
      if (data.name && data.name.trim().length < 3) {
        errors.push('Name must be at least 3 characters')
      }
      
      if (data.name && data.name.length > 100) {
        errors.push('Name must not exceed 100 characters')
      }
      
      if (data.description && data.description.length > 500) {
        errors.push('Description must not exceed 500 characters')
      }
    }
    
    return { valid: errors.length === 0, errors }
  }

  /**
   * Clears the priority calculation cache.
   * Useful when item data changes or for testing.
   */
  clearCache(): void {
    this.priorityCache.clear()
  }

  /**
   * Gets the size of the priority cache (for monitoring/testing).
   */
  getCacheSize(): number {
    return this.priorityCache.size()
  }
}
