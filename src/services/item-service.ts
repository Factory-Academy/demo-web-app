import { Item } from '@/models/item'
import { validate, stringRequired, stringEnum, stringOptional } from '@/utils/validators'

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

  validate(data: Partial<Item>): { valid: boolean; errors: string[] } {
    const schema = {
      name: stringRequired('name'),
      status: stringEnum('status', ['active', 'pending', 'completed']),
      description: stringOptional(),
    }

    const result = validate(data, schema)
    const errors: string[] = Object.values(result.errors)

    return { valid: result.valid, errors }
  }
}
