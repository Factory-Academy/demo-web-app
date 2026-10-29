import { Item } from '@/models/item'
import {
  ValidationResult,
  ValidationErrorBuilder,
  validationSuccess,
} from '@/utils/validation-error'

type Priority = 'critical' | 'high' | 'medium' | 'low'

export class ItemService {
  /**
   * Calculate priority for an item with validation
   * @returns ValidationResult containing priority or errors
   */
  calculatePriority(record: Item): ValidationResult<Priority> {
    const errorBuilder = new ValidationErrorBuilder()

    // Validate required fields
    if (!record.createdAt) {
      errorBuilder.addFieldError('createdAt', 'Created date is required', 'MISSING_CREATED_AT')
    }

    // Parse and validate date format
    const createdDate = new Date(record.createdAt)
    if (record.createdAt && isNaN(createdDate.getTime())) {
      errorBuilder.addFieldError('createdAt', 'Invalid date format', 'INVALID_DATE')
    }

    // Validate status if we need it for calculation
    const validStatuses = ['active', 'pending', 'completed', 'urgent']
    if (record.status && !validStatuses.includes(record.status)) {
      errorBuilder.addFieldError('status', 'Invalid status value', 'INVALID_STATUS')
    }

    if (errorBuilder.hasErrors()) {
      return errorBuilder.build()
    }

    // Calculate priority
    const ageMs = Date.now() - createdDate.getTime()
    const ageDays = Math.floor(ageMs / 86400000)
    let baseScore = 0

    if (record.status === 'urgent') baseScore += 50
    if (ageDays > 30) baseScore += ageDays * 0.5

    let priority: Priority
    if (baseScore >= 80) priority = 'critical'
    else if (baseScore >= 50) priority = 'high'
    else if (baseScore >= 20) priority = 'medium'
    else priority = 'low'

    return validationSuccess(priority)
  }

  /**
   * Validate item data for creation/update
   * @returns ValidationResult indicating success or containing errors
   */
  validate(data: Partial<Item>): ValidationResult {
    const errorBuilder = new ValidationErrorBuilder()

    if (!data.name?.trim()) {
      errorBuilder.addFieldError('name', 'Name is required', 'MISSING_NAME')
    }

    const validStatuses = ['active', 'pending', 'completed', 'urgent']
    if (data.status && !validStatuses.includes(data.status)) {
      errorBuilder.addFieldError('status', 'Invalid status value', 'INVALID_STATUS')
    }

    return errorBuilder.build()
  }
}
