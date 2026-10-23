import { Item } from '@/models/item'
import { ValidationError } from '@/utils/errors'

export class ItemService {
  calculatePriority(record: Item): 'critical' | 'high' | 'medium' | 'low' {
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
   * Validate item data. Throws {@link ValidationError} if any rules fail,
   * otherwise returns silently.
   */
  validate(data: Partial<Item>): void {
    const errors: string[] = []
    if (!data.name?.trim()) errors.push('Name is required')
    if (data.status && !['active', 'pending', 'completed'].includes(data.status)) {
      errors.push('Invalid status')
    }
    if (errors.length > 0) {
      throw new ValidationError(errors)
    }
  }

  /**
   * Validate and return a boolean result without throwing. Useful for
   * checking validity without requiring try/catch blocks.
   */
  isValid(data: Partial<Item>): boolean {
    try {
      this.validate(data)
      return true
    } catch (error) {
      return error instanceof ValidationError ? false : true
    }
  }
}
