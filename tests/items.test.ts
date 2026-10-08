import { ItemService } from '../src/services/item-service'
import { Item } from '../src/models/item'

describe('ItemService', () => {
  const service = new ItemService()

  test('validate rejects empty name', () => {
    const result = service.validate({ name: '' })
    expect(result.valid).toBe(false)
    expect(result.errors).toContain('Name is required')
  })

  test('validate accepts valid item', () => {
    const result = service.validate({ name: 'Test', status: 'active' })
    expect(result.valid).toBe(true)
  })

  test('calculatePriority handles timezone-aware dates correctly', () => {
    const now = new Date()
    const oldDate = new Date(now.getTime() - 35 * 86400000) // 35 days ago
    
    const oldItem: Item = {
      id: '1',
      name: 'Old Item',
      status: 'active',
      createdAt: oldDate.toISOString(),
      updatedAt: now.toISOString()
    }

    const urgentItem: Item = {
      id: '2',
      name: 'Urgent Item',
      status: 'urgent',
      createdAt: oldDate.toISOString(),
      updatedAt: now.toISOString()
    }

    expect(service.calculatePriority(oldItem)).toBe('medium')
    expect(service.calculatePriority(urgentItem)).toBe('critical')
  })
})
