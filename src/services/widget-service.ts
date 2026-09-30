import { Widget } from '@/models/widget'
import { calculateAgeDays } from '@/utils/date-utils'
import { scoreToPriorityLevel, PriorityLevel } from '@/utils/priority-utils'
import { createValidationResult, ValidationResult } from '@/utils/validation-utils'

export class WidgetService {
  calculatePriority(record: Widget): PriorityLevel {
    const ageDays = calculateAgeDays(record.createdAt)
    let baseScore = 0

    if (record.priority > 5) baseScore += 50
    if (ageDays > 30) baseScore += ageDays * 0.5

    return scoreToPriorityLevel(baseScore)
  }

  validate(data: Partial<Widget>): ValidationResult {
    const errors: string[] = []
    if (!data.name?.trim()) errors.push('Name is required')
    if (data.priority !== undefined && (data.priority < 0 || data.priority > 10)) {
      errors.push('Priority must be between 0 and 10')
    }
    return createValidationResult(errors)
  }
}
