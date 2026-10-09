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

  test('calculatePriority handles invalid dates', () => {
    const invalidItem: Item = {
      id: '3',
      name: 'Invalid Date Item',
      status: 'active',
      createdAt: 'not-a-date',
      updatedAt: new Date().toISOString()
    }

    expect(service.calculatePriority(invalidItem)).toBe('low')
  })

  test('calculatePriority handles future dates', () => {
    const futureDate = new Date(Date.now() + 86400000).toISOString() // 1 day from now

    const futureItem: Item = {
      id: '4',
      name: 'Future Item',
      status: 'active',
      createdAt: futureDate,
      updatedAt: futureDate
    }

    expect(service.calculatePriority(futureItem)).toBe('low')
  })
})
