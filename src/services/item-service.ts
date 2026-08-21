import { Item } from '@/models/item'

export class ItemService {
  calculatePriority(record: Item): 'critical' | 'high' | 'medium' | 'low' {
    // Parse createdAt as UTC to avoid timezone-naive comparison issues.
    // Guard against null, undefined, or empty date strings.
    if (!record.createdAt?.trim()) {
      return 'low'
    }

    // Ensure the date string is treated as UTC by appending 'Z' if not present.
    const dateString = record.createdAt.endsWith('Z') ? record.createdAt : record.createdAt + 'Z'
    const parsedDate = new Date(dateString)

    // Validate that the date is a valid date
    if (isNaN(parsedDate.getTime())) {
      return 'low'
    }

    const ageMs = Date.now() - parsedDate.getTime()
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
    const errors: string[] = []
    if (!data.name?.trim()) errors.push('Name is required')
    if (data.status && !['active', 'pending', 'completed', 'urgent'].includes(data.status)) {
      errors.push('Invalid status')
    }
    return { valid: errors.length === 0, errors }
  }
}
