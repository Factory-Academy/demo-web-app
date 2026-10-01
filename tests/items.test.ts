import { ItemService } from '../src/services/item-service'

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
    expect(result.errors).toHaveLength(0)
  })

  test('validate rejects invalid status', () => {
    const result = service.validate({ name: 'Test', status: 'invalid' })
    expect(result.valid).toBe(false)
    expect(result.errors).toContain('Invalid status')
  })

  test('validate accepts item without status', () => {
    const result = service.validate({ name: 'Test' })
    expect(result.valid).toBe(true)
  })

  test('calculatePriority returns critical for urgent items', () => {
    const urgentItem = {
      id: '1',
      name: 'Urgent',
      status: 'urgent',
      createdAt: new Date(Date.now() - 1000).toISOString(),
      updatedAt: new Date().toISOString(),
    }
    const priority = service.calculatePriority(urgentItem)
    expect(priority).toBe('critical')
  })
})
