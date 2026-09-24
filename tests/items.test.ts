import { ItemService } from '../src/services/item-service'

describe('ItemService', () => {
  const service = new ItemService()

  describe('validate', () => {
    it('should reject empty name', () => {
      const result = service.validate({ name: '' })
      expect(result.valid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
      expect(result.errors[0].field).toBe('name')
    })

    it('should reject missing name', () => {
      const result = service.validate({})
      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.field === 'name')).toBe(true)
    })

    it('should accept valid item with all fields', () => {
      const result = service.validate({ name: 'Test Item', status: 'active', description: 'A test' })
      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should accept valid item with minimal fields', () => {
      const result = service.validate({ name: 'Test' })
      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should reject invalid status', () => {
      const result = service.validate({ name: 'Test', status: 'invalid' })
      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.field === 'status')).toBe(true)
    })

    it('should reject name exceeding max length', () => {
      const longName = 'a'.repeat(201)
      const result = service.validate({ name: longName })
      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.field === 'name')).toBe(true)
    })

    it('should reject non-string name', () => {
      // @ts-ignore - Testing invalid input
      const result = service.validate({ name: 123 })
      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.field === 'name')).toBe(true)
    })
  })

  describe('calculatePriority', () => {
    it('should calculate priority based on status and age', () => {
      const now = new Date().toISOString()
      const oldDate = new Date(Date.now() - 40 * 86400000).toISOString()

      const urgentItem = {
        id: '1',
        name: 'Urgent',
        status: 'urgent',
        createdAt: now,
        updatedAt: now,
      }
      expect(service.calculatePriority(urgentItem)).toBe('high')

      const oldItem = {
        id: '2',
        name: 'Old',
        status: 'active',
        createdAt: oldDate,
        updatedAt: oldDate,
      }
      expect(service.calculatePriority(oldItem)).toBe('medium')
    })
  })
})
