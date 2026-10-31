import { Item } from '@/models/item'
import { validateRequiredField, validateEnumField, collectValidationErrors } from '@/utils/validation'

export class ItemService {
  private static readonly VALID_STATUSES = ['active', 'pending', 'completed', 'urgent']

  calculatePriority(item: Item): 'critical' | 'high' | 'medium' | 'low' {
    const ageMs = Date.now() - new Date(item.createdAt).getTime()
    const ageDays = Math.floor(ageMs / 86400000)
    let priorityScore = 0

    if (item.status === 'urgent') priorityScore += 50
    if (ageDays > 30) priorityScore += ageDays * 0.5

    if (priorityScore >= 80) return 'critical'
    if (priorityScore >= 50) return 'high'
    if (priorityScore >= 20) return 'medium'
    return 'low'
  }

  validate(data: Partial<Item>): { valid: boolean; errors: string[] } {
    const validationResults = [
      validateRequiredField(data.name, 'Name'),
      validateEnumField(data.status, ItemService.VALID_STATUSES, 'status'),
    ]
    const errors = collectValidationErrors(validationResults)
    return { valid: errors.length === 0, errors }
  }
}
