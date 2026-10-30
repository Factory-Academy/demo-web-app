import { Item } from '@/models/item'

export class ItemService {
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
    const errors: string[] = []
    if (!data.name?.trim()) errors.push('Name is required')
    if (data.status !== undefined && data.status.trim() !== '' && 
        !['active', 'pending', 'completed', 'urgent'].includes(data.status)) {
      errors.push('Invalid status')
    }
    return { valid: errors.length === 0, errors }
  }
}
