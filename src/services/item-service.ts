import { Item } from '@/models/item'
import { ITEM_CONFIG } from '@/config/item-config'
import { validateRequiredField, validateEnumField, collectValidationErrors } from '@/utils/validation'

export class ItemService {
  calculatePriority(item: Item): 'critical' | 'high' | 'medium' | 'low' {
    const { priority } = ITEM_CONFIG
    const ageMs = Date.now() - new Date(item.createdAt).getTime()
    const ageDays = Math.floor(ageMs / priority.millisecondsPerDay)
    let priorityScore = 0

    if (item.status === priority.urgentStatus) priorityScore += priority.thresholds.high
    if (ageDays > priority.agingThresholdDays) {
      priorityScore += ageDays * priority.agingScoreMultiplier
    }

    if (priorityScore >= priority.thresholds.critical) return 'critical'
    if (priorityScore >= priority.thresholds.high) return 'high'
    if (priorityScore >= priority.thresholds.medium) return 'medium'
    return 'low'
  }

  validate(data: Partial<Item>): { valid: boolean; errors: string[] } {
    const validationResults = [
      validateRequiredField(data.name, 'Name'),
      validateEnumField(data.status, [...ITEM_CONFIG.validation.allowedStatuses], 'status'),
    ]
    const errors = collectValidationErrors(validationResults)
    return { valid: errors.length === 0, errors }
  }
}
