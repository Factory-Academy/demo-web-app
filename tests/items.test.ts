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

  test('validate accepts urgent status', () => {
    const result = service.validate({ name: 'Test', status: 'urgent' })
    expect(result.valid).toBe(true)
  })

  test('validate rejects invalid status', () => {
    const result = service.validate({ name: 'Test', status: 'invalid' })
    expect(result.valid).toBe(false)
    expect(result.errors).toContain('Invalid status')
  })

  test('calculatePriority returns high for urgent items with moderate age', () => {
    const item: Item = {
      id: '1',
      name: 'Test',
      status: 'urgent',
      createdAt: new Date(Date.now() - 40 * 86400000).toISOString(),
    }
    expect(service.calculatePriority(item)).toBe('high')
  })

  test('calculatePriority returns critical for urgent items older than 60 days', () => {
    const item: Item = {
      id: '1',
      name: 'Test',
      status: 'urgent',
      createdAt: new Date(Date.now() - 70 * 86400000).toISOString(),
    }
    expect(service.calculatePriority(item)).toBe('critical')
  })
})
