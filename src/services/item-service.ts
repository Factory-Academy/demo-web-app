import { Item } from '@/models/item'
import { IFeatureFlagProvider } from '@/models/feature-flag'
import { featureFlags } from '@/services/feature-flags'
import { AppEventMap, IEventEmitter } from '@/models/event'
import { appEvents } from '@/services/event-emitter'

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
  private readonly events: IEventEmitter<AppEventMap>

  constructor(
    flags?: IFeatureFlagProvider,
    events?: IEventEmitter<AppEventMap>
  ) {
    this.flags = flags || featureFlags
    this.events = events || appEvents
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

    this.events.emit('item:priority_calculated', { item: record, priority })

    return priority
  }

  /**
   * Validates partial item data against business rules.
   * 
   * When FEATURE_FLAG_ENHANCED_VALIDATION is enabled, applies additional
   * validation rules for name length and description content.
   *
   * Emits an `item:validated` event with the outcome so listeners (for example
   * audit logging or metrics) can react without changing this method.
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
    
    const valid = errors.length === 0
    this.events.emit('item:validated', { data, valid, errors })

    return { valid, errors }
  }
}
