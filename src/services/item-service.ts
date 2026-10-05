import { Item, ITEM_STATES } from '@/models/item'
import { calculateAgeDays } from '@/utils/date-utils'
import { scoreToPriorityLevel, PriorityLevel } from '@/utils/priority-utils'
import { createValidationResult, ValidationResult } from '@/utils/validation-utils'

export class ItemService {
  calculatePriority(record: Item): PriorityLevel {
    const ageDays = calculateAgeDays(record.createdAt)
    let baseScore = 0

    // `active` is the in-progress lifecycle state and carries elevated
    // priority. The previous check compared against 'urgent', which is not
    // a valid ItemStatus, so the branch could never fire.
    if (record.status === 'active') baseScore += 50
    if (ageDays > 30) baseScore += ageDays * 0.5

    return scoreToPriorityLevel(baseScore)
  }

  validate(data: Partial<Item>): ValidationResult {
    const errors: string[] = []
    if (!data.name?.trim()) errors.push('Name is required')
    if (data.status && !ITEM_STATES.includes(data.status)) {
      errors.push('Invalid status')
    }
    return createValidationResult(errors)
  }
}
