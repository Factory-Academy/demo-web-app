import { Item, ItemCreate } from '@/models/item'
import { createValidator, validators, ValidationResult } from '@/utils/validate'

const VALID_STATUSES = ['active', 'pending', 'completed', 'urgent'] as const

// Schema for validating item creation
const itemCreateSchema = {
  name: {
    required: true,
    validators: [
      validators.string({ minLength: 1, maxLength: 200 }),
      validators.custom<string>((val) => val.trim().length > 0, '{field} cannot be empty or whitespace'),
    ],
  },
  description: {
    required: false,
    validators: [validators.string({ maxLength: 1000 })],
  },
  status: {
    required: false,
    validators: [validators.enum(VALID_STATUSES)],
  },
}

// Schema for validating item updates
const itemUpdateSchema = {
  name: {
    required: false,
    validators: [
      validators.string({ minLength: 1, maxLength: 200 }),
      validators.custom<string>((val) => val.trim().length > 0, '{field} cannot be empty or whitespace'),
    ],
  },
  description: {
    required: false,
    validators: [validators.string({ maxLength: 1000 })],
  },
  status: {
    required: false,
    validators: [validators.enum(VALID_STATUSES)],
  },
}

export class ItemService {
  private validateCreate = createValidator<ItemCreate>(itemCreateSchema)
  private validateUpdate = createValidator<Partial<Item>>(itemUpdateSchema)

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
    return this.validateUpdate(data)
  }

  validateForCreate(data: ItemCreate): ValidationResult {
    return this.validateCreate(data)
  }
}
