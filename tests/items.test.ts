import { ItemService } from '../src/services/item-service'

describe('ItemService', () => {
  const service = new ItemService()

  test('validate rejects empty name', () => {
    const result = service.validate({ name: '' })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.errors).toContain('Name is required')
    }
  })

  test('validate accepts valid item', () => {
    const result = service.validate({ name: 'Test', status: 'active' })
    expect(result.success).toBe(true)
  })

  test('calculatePriority returns error for invalid date', () => {
    const result = service.calculatePriority({
      id: '1',
      name: 'Test',
      status: 'active',
      createdAt: 'invalid-date',
      updatedAt: 'invalid-date',
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.errors).toContain('Invalid creation date')
    }
  })

  test('create adds id and timestamps to valid data', () => {
    const result = service.create({ name: 'New Item', status: 'active' })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.id).toBeDefined()
      expect(result.data.createdAt).toBeDefined()
      expect(result.data.name).toBe('New Item')
    }
  })
})
