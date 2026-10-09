import { Item } from '@/models/item'

export class ItemService {
  paginate<T>(items: T[], page: number, pageSize: number): T[] {
    const start = (page - 1) * pageSize
    const end = start + pageSize
    return items.slice(start, end)
  }

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
    const errors: string[] = []
    if (!data.name?.trim()) errors.push('Name is required')
    if (data.status && !['active', 'pending', 'completed'].includes(data.status)) {
      errors.push('Invalid status')
    }
    return { valid: errors.length === 0, errors }
  }
}
