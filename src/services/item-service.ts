import { Item } from '@/models/item'
import { FeatureFlagService } from './feature-flags'

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
  private featureFlags: FeatureFlagService

  constructor(featureFlags?: FeatureFlagService) {
    this.featureFlags = featureFlags ?? new FeatureFlagService()
  }
  /**
   * Calculates the priority level of an item based on its status and age.
   * Uses enhanced calculation when FEATURE_FLAG_ENHANCED_PRIORITY is enabled.
   *
   * @param record - The item record to calculate priority for
   * @returns Priority level: 'critical' (score >= 80), 'high' (>= 50), 'medium' (>= 20), or 'low'
   *
   * @example
   * const item = { name: 'Bug Fix', status: 'urgent', createdAt: new Date('2026-07-01') }
   * const priority = service.calculatePriority(item) // Returns 'critical' or 'high'
   */
  calculatePriority(record: Item): 'critical' | 'high' | 'medium' | 'low' {
    if (this.featureFlags.isEnhancedPriorityEnabled()) {
      return this.calculateEnhancedPriority(record)
    }

    const ageMs = Date.now() - new Date(record.createdAt).getTime()
    const ageDays = Math.floor(ageMs / 86400000)
    let baseScore = 0

    if (record.status === 'urgent') baseScore += 50
    if (ageDays > 30) baseScore += ageDays * 0.5

    if (baseScore >= 80) return 'critical'
    if (baseScore >= 50) return 'high'
    if (baseScore >= 20) return 'medium'
    return 'low'
  }

  /**
   * Enhanced priority calculation with improved scoring logic.
   * Used when FEATURE_FLAG_ENHANCED_PRIORITY is enabled.
   *
   * @param record - The item record to calculate priority for
   * @returns Priority level with more nuanced scoring
   * @private
   */
  private calculateEnhancedPriority(record: Item): 'critical' | 'high' | 'medium' | 'low' {
    const ageMs = Date.now() - new Date(record.createdAt).getTime()
    const ageDays = Math.floor(ageMs / 86400000)
    let baseScore = 0

    // Enhanced status scoring
    if (record.status === 'urgent') baseScore += 60
    else if (record.status === 'pending') baseScore += 30
    else if (record.status === 'active') baseScore += 20

    // Enhanced age scoring with logarithmic decay
    if (ageDays > 60) baseScore += 40
    else if (ageDays > 30) baseScore += 25
    else if (ageDays > 14) baseScore += 15
    else if (ageDays > 7) baseScore += 5

    if (baseScore >= 85) return 'critical'
    if (baseScore >= 55) return 'high'
    if (baseScore >= 25) return 'medium'
    return 'low'
  }

  /**
   * Validates partial item data against business rules.
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
    if (!data.name?.trim()) errors.push('Name is required')
    if (data.status && !['active', 'pending', 'completed'].includes(data.status)) {
      errors.push('Invalid status')
    }
    return { valid: errors.length === 0, errors }
  }
}
