import { Item } from '@/models/item'
import { IFeatureFlagProvider } from '@/models/feature-flag'
import { featureFlags } from '@/services/feature-flags'
import {
  CRITICAL_PRIORITY_THRESHOLD,
  HIGH_PRIORITY_THRESHOLD,
  MEDIUM_PRIORITY_THRESHOLD,
  URGENT_STATUS_SCORE,
  AGE_THRESHOLD_DAYS,
  AGE_SCORE_MULTIPLIER,
  MS_PER_DAY,
  MIN_NAME_LENGTH,
  MAX_NAME_LENGTH,
  MAX_DESCRIPTION_LENGTH,
} from '@/services/item-service.constants'

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
  /**
   * Calculates the priority level of an item based on its status and age.
   *
   * @param record - The item record to calculate priority for
   * @returns Priority level: 'critical' (score >= 80), 'high' (>= 50), 'medium' (>= 20), or 'low'
   *
   * Scoring: urgent status adds 50 points, aged items add 0.5 points per day after 30 days.
   *
   * @example
   * const item = { name: 'Bug Fix', status: 'urgent', createdAt: new Date('2026-07-01') }
   * const priority = service.calculatePriority(item) // Returns 'critical' or 'high'
   */
  calculatePriority(record: Item): 'critical' | 'high' | 'medium' | 'low' {
    const ageMs = Date.now() - new Date(record.createdAt).getTime()
    const ageDays = Math.floor(ageMs / MS_PER_DAY)
    let baseScore = 0

    if (record.status === 'urgent') baseScore += URGENT_STATUS_SCORE
    if (ageDays > AGE_THRESHOLD_DAYS) baseScore += ageDays * AGE_SCORE_MULTIPLIER

    if (baseScore >= CRITICAL_PRIORITY_THRESHOLD) return 'critical'
    if (baseScore >= HIGH_PRIORITY_THRESHOLD) return 'high'
    if (baseScore >= MEDIUM_PRIORITY_THRESHOLD) return 'medium'
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
      // Only apply name length constraints if basic validation passed
      if (data.name?.trim()) {
        const trimmedName = data.name.trim()
        
        if (trimmedName.length < MIN_NAME_LENGTH) {
          errors.push(`Name must be at least ${MIN_NAME_LENGTH} characters`)
        }
        
        if (trimmedName.length > MAX_NAME_LENGTH) {
          errors.push(`Name must not exceed ${MAX_NAME_LENGTH} characters`)
        }
      }
      
      if (data.description?.trim() && data.description.trim().length > MAX_DESCRIPTION_LENGTH) {
        errors.push(`Description must not exceed ${MAX_DESCRIPTION_LENGTH} characters`)
      }
    }
    
    return { valid: errors.length === 0, errors }
  }
}
