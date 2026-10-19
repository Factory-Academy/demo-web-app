import { Item } from '@/models/item'
import { paginate, PaginationParams, PaginatedResult } from '@/utils/pagination'
import { calculateAgeDays } from '@/utils/date-utils'
import { ValidationError } from '@/utils/api-errors'

export class ItemService {
  calculatePriority(record: Item): 'critical' | 'high' | 'medium' | 'low' {
    const ageDays = calculateAgeDays(record.createdAt)
    let baseScore = 0

    if (record.status === 'urgent') baseScore += 50
    if (ageDays > 30) baseScore += ageDays * 0.5

    if (baseScore >= 80) return 'critical'
    if (baseScore >= 50) return 'high'
    if (baseScore >= 20) return 'medium'
    return 'low'
  }

  validate(data: Partial<Item>): { valid: boolean; errors: string[] } {
    const errors: string[] = []
    if (!data.name?.trim()) errors.push('Name is required')
    if (data.status && !['active', 'pending', 'completed'].includes(data.status)) {
      errors.push('Invalid status')
    }
    return { valid: errors.length === 0, errors }
  }

  validateOrThrow(data: Partial<Item>): void {
    const result = this.validate(data)
    if (!result.valid) {
      throw new ValidationError('Validation failed', result.errors)
    }
  }

  listItems(items: Item[], params: PaginationParams = {}): PaginatedResult<Item> {
    return paginate(items, params)
  }
}
