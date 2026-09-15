import { Item } from '@/models/item'
import { IFeatureFlagProvider } from '@/models/feature-flag'
import { featureFlags } from '@/services/feature-flags'
import {
  PriorityLevel,
  PriorityResult,
  PriorityStrategy,
} from '@/models/priority-strategy'
import { createPriorityStrategy } from '@/services/priority-strategy-factory'

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
  private readonly priorityStrategy: PriorityStrategy

  /**
   * @param flags - Feature flag provider (defaults to the shared env provider)
   * @param priorityStrategy - Strategy used to compute item priority. Defaults
   *   to the factory's default ('status-weighted'), which preserves the
   *   historical scoring behaviour.
   */
  constructor(flags?: IFeatureFlagProvider, priorityStrategy?: PriorityStrategy) {
    this.flags = flags || featureFlags
    this.priorityStrategy = priorityStrategy || createPriorityStrategy()
  }
  /**
   * Calculates the priority level of an item using the configured strategy.
   *
   * @param record - The item record to calculate priority for
   * @returns Priority level: 'critical' (score >= 80), 'high' (>= 50), 'medium' (>= 20), or 'low'
   *
   * @example
   * const item = { name: 'Bug Fix', status: 'urgent', createdAt: new Date('2026-07-01') }
   * const priority = service.calculatePriority(item) // Returns 'critical' or 'high'
   */
  calculatePriority(record: Item): PriorityLevel {
    return this.priorityStrategy.evaluate(record).level
  }

  /**
   * Evaluates an item's priority and returns the full result, including the
   * raw score and the reasons that contributed to it.
   *
   * Use this when the caller needs to explain or audit a priority decision;
   * use {@link ItemService.calculatePriority} when only the level is needed.
   *
   * @param record - The item record to evaluate
   * @returns The level, raw score, and contributing reasons
   */
  evaluatePriority(record: Item): PriorityResult {
    return this.priorityStrategy.evaluate(record)
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
