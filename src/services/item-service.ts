import { Item } from '@/models/item'
import { IFeatureFlagProvider } from '@/models/feature-flag'
import { featureFlags } from '@/services/feature-flags'

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

  constructor(flags?: IFeatureFlagProvider) {
    this.flags = flags || featureFlags
  }

  private getAgeDays(createdAt: string): number {
    const createdDate = new Date(createdAt)
    if (Number.isNaN(createdDate.getTime())) {
      return 0
    }

    const now = new Date()
    const todayUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
    const createdUtc = Date.UTC(
      createdDate.getUTCFullYear(),
      createdDate.getUTCMonth(),
      createdDate.getUTCDate(),
    )

    return Math.max(0, Math.floor((todayUtc - createdUtc) / 86400000))
  }
  /**
   * Calculates the priority level of an item based on its status and age.
   *
   * @param record - The item record to calculate priority for
   * @returns Priority level: 'critical' (score >= 80), 'high' (>= 50), 'medium' (>= 20), or 'low'
   *
   * @example
   * const item = { name: 'Bug Fix', status: 'urgent', createdAt: new Date('2026-07-01') }
   * const priority = service.calculatePriority(item) // Returns 'critical' or 'high'
   */
  calculatePriority(record: Item): 'critical' | 'high' | 'medium' | 'low' {
    const ageDays = this.getAgeDays(record.createdAt)
    let baseScore = 0

    if (record.status === 'urgent') baseScore += 50
    if (ageDays > 30) baseScore += ageDays * 0.5

    if (baseScore >= 80) return 'critical'
    if (baseScore >= 50) return 'high'
    if (baseScore >= 20) return 'medium'
    return 'low'
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
}
