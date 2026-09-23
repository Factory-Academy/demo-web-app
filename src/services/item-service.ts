import { Item, ItemCreate } from '@/models/item'
import { ServiceResult, success, failure } from './types'

export class ItemService {
  calculatePriority(record: Item): ServiceResult<'critical' | 'high' | 'medium' | 'low'> {
    const date = new Date(record.createdAt)
    if (isNaN(date.getTime())) {
      return failure('Invalid creation date')
    }

    const ageMs = Date.now() - date.getTime()
    const ageDays = Math.floor(ageMs / 86400000)
    let baseScore = 0

    if (record.status === 'urgent') baseScore += 50
    if (ageDays > 30) baseScore += ageDays * 0.5

    if (baseScore >= 80) return success('critical')
    if (baseScore >= 50) return success('high')
    if (baseScore >= 20) return success('medium')
    return success('low')
  }

  validate(data: Partial<ItemCreate>): ServiceResult<void> {
    const errors: string[] = []
    if (!data.name?.trim()) errors.push('Name is required')
    if (data.status && !['active', 'pending', 'completed', 'urgent'].includes(data.status)) {
      errors.push('Invalid status')
    }
    return errors.length === 0 ? success(undefined) : failure(errors)
  }

  create(data: ItemCreate): ServiceResult<Item> {
    const validation = this.validate(data)
    if (!validation.success) {
      return failure(validation.errors)
    }

    const item: Item = {
      id: Math.random().toString(36).substring(7),
      name: data.name,
      description: data.description,
      status: data.status || 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    return success(item)
  }
}
