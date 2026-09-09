import { ItemService } from '../src/services/item-service'

describe('ItemService', () => {
  const service = new ItemService()

  describe('calculatePriority', () => {
    test('returns high priority for urgent items', () => {
      const item = { name: 'Task', status: 'urgent' as const, createdAt: new Date() }
      const priority = service.calculatePriority(item)
      expect(['high', 'critical']).toContain(priority)
    })
  })

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
  })
})
