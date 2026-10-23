import { Item } from '@/models/item'
import { ValidationError, requirePresent, requireNonEmpty } from '@/lib/validation-error'

export class ItemService {
  calculatePriority(record: Item): 'critical' | 'high' | 'medium' | 'low' {
    requirePresent(record, 'Record is required')
    requirePresent(record.createdAt, 'Record createdAt is required')
    requirePresent(record.status, 'Record status is required')

    const timestamp = new Date(record.createdAt).getTime()
    if (isNaN(timestamp)) {
      ValidationError.throw('Invalid createdAt timestamp')
    }

    const ageMs = Date.now() - timestamp
    const ageDays = Math.floor(ageMs / 86400000)
    let baseScore = 0

    if (record.status === 'urgent') baseScore += 50
    if (ageDays > 30) baseScore += ageDays * 0.5

    if (baseScore >= 80) return 'critical'
    if (baseScore >= 50) return 'high'
    if (baseScore >= 20) return 'medium'
    return 'low'
  }

  validate(data: Partial<Item>): void {
    const errors: string[] = []

    if (!data.name?.trim()) {
      errors.push('Name is required')
    }

    if (data.status && !['active', 'pending', 'completed', 'urgent'].includes(data.status)) {
      errors.push('Invalid status')
    }

    if (errors.length > 0) {
      ValidationError.throwAll(errors)
    }
  }
}
