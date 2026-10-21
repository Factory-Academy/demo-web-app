import { ItemService } from '../src/services/item-service'
import { Item } from '../src/models/item'

describe('ItemService', () => {
  const service = new ItemService()

  describe('validate', () => {
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
      const result = service.validate({ name: 'Critical Fix', status: 'urgent' })
      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    test('validate rejects invalid status', () => {
      const result = service.validate({ name: 'Test', status: 'invalid' as any })
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Invalid status')
    })
  })

  describe('calculatePriority', () => {
    test('calculatePriority returns critical for old urgent items', () => {
      const item: Item = {
        id: '1',
        name: 'Fix critical bug',
        status: 'urgent',
        createdAt: new Date(Date.now() - 60 * 86400000).toISOString(),
        updatedAt: new Date().toISOString()
      }
      const priority = service.calculatePriority(item)
      expect(priority).toBe('critical')
    })
  })
})
