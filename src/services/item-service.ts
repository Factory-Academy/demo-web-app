import { Item } from '@/models/item'
import { validate, compose, required, isString, minLength, maxLength, oneOf, ValidationResult } from '@/lib/validators'

const itemValidationSchema = {
  name: {
    required: true,
    validator: compose(isString, minLength(1), maxLength(200)),
  },
  description: {
    required: false,
    validator: compose(isString, maxLength(1000)),
  },
  status: {
    required: false,
    validator: oneOf(['active', 'pending', 'completed']),
  },
}

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

  validate(data: Partial<Item>): ValidationResult {
    return validate(data, itemValidationSchema)
  }
}
