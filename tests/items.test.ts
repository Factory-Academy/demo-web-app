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

  test('calculatePriority returns critical for urgent old items', () => {
    const oldDate = new Date(Date.now() - 40 * 86400000).toISOString()
    const item: Item = {
      id: '1',
      name: 'Test',
      status: 'urgent',
      createdAt: oldDate,
      updatedAt: oldDate,
    }
    const priority = service.calculatePriority(item)
    expect(priority).toBe('critical')
  })

  test('calculatePriority returns low for recent non-urgent items', () => {
    const recentDate = new Date(Date.now() - 5 * 86400000).toISOString()
    const item: Item = {
      id: '2',
      name: 'Test',
      status: 'active',
      createdAt: recentDate,
      updatedAt: recentDate,
    }
    const priority = service.calculatePriority(item)
    expect(priority).toBe('low')
  })
})
