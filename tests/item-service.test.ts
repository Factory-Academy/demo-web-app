import { ItemService } from '../src/services/item-service'
import { Item, ItemCreate } from '../src/models/item'

describe('ItemService', () => {
  let service: ItemService

  beforeEach(() => {
    service = new ItemService()
  })

  describe('calculatePriority', () => {
    test('returns critical for urgent items with significant age', () => {
      const item: Item = {
        id: '1',
        name: 'Test',
        status: 'urgent',
        createdAt: new Date(Date.now() - 65 * 86400000).toISOString(),
        updatedAt: new Date().toISOString(),
      }
      expect(service.calculatePriority(item)).toBe('critical')
    })

    test('returns high for urgent items', () => {
      const item: Item = {
        id: '1',
        name: 'Test',
        status: 'urgent',
        createdAt: new Date(Date.now() - 5 * 86400000).toISOString(),
        updatedAt: new Date().toISOString(),
      }
      expect(service.calculatePriority(item)).toBe('high')
    })

    test('returns medium for moderately old items', () => {
      const item: Item = {
        id: '1',
        name: 'Test',
        status: 'active',
        createdAt: new Date(Date.now() - 50 * 86400000).toISOString(),
        updatedAt: new Date().toISOString(),
      }
      expect(service.calculatePriority(item)).toBe('medium')
    })

    test('returns low for recent non-urgent items', () => {
      const item: Item = {
        id: '1',
        name: 'Test',
        status: 'active',
        createdAt: new Date(Date.now() - 5 * 86400000).toISOString(),
        updatedAt: new Date().toISOString(),
      }
      expect(service.calculatePriority(item)).toBe('low')
    })
  })

  describe('validate', () => {
    test('accepts valid partial item data', () => {
      const result = service.validate({
        name: 'Valid Name',
        status: 'active',
      })
      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    test('accepts data with optional description', () => {
      const result = service.validate({
        name: 'Valid Name',
        description: 'A valid description',
        status: 'pending',
      })
      expect(result.valid).toBe(true)
    })

    test('rejects invalid status values', () => {
      const result = service.validate({
        name: 'Valid Name',
        status: 'invalid-status',
      })
      expect(result.valid).toBe(false)
      expect(result.errors.some((e) => e.includes('status'))).toBe(true)
    })

    test('rejects whitespace-only name', () => {
      const result = service.validate({
        name: '   ',
      })
      expect(result.valid).toBe(false)
      expect(result.errors.some((e) => e.includes('name'))).toBe(true)
    })

    test('rejects name exceeding max length', () => {
      const longName = 'a'.repeat(201)
      const result = service.validate({
        name: longName,
      })
      expect(result.valid).toBe(false)
      expect(result.errors.some((e) => e.includes('name') && e.includes('200'))).toBe(true)
    })

    test('rejects description exceeding max length', () => {
      const longDesc = 'a'.repeat(1001)
      const result = service.validate({
        name: 'Valid',
        description: longDesc,
      })
      expect(result.valid).toBe(false)
      expect(result.errors.some((e) => e.includes('description') && e.includes('1000'))).toBe(true)
    })

    test('allows empty object for partial updates', () => {
      const result = service.validate({})
      expect(result.valid).toBe(true)
    })

    test('accepts empty string for optional description', () => {
      const result = service.validate({
        name: 'Valid Name',
        description: '',
      })
      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    test('rejects name with only whitespace when provided', () => {
      const result = service.validate({
        name: '  \t\n  ',
      })
      expect(result.valid).toBe(false)
      expect(result.errors.some((e) => e.includes('whitespace'))).toBe(true)
    })

    test('collects multiple validation errors', () => {
      const result = service.validate({
        name: '',
        status: 'invalid',
        description: 'x'.repeat(1001),
      })
      expect(result.valid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(1)
    })
  })

  describe('validateForCreate', () => {
    test('accepts valid item creation data', () => {
      const data: ItemCreate = {
        name: 'New Item',
        description: 'Description',
        status: 'active',
      }
      const result = service.validateForCreate(data)
      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    test('accepts minimal valid data', () => {
      const data: ItemCreate = {
        name: 'New Item',
      }
      const result = service.validateForCreate(data)
      expect(result.valid).toBe(true)
    })

    test('requires name field', () => {
      const data = {} as ItemCreate
      const result = service.validateForCreate(data)
      expect(result.valid).toBe(false)
      expect(result.errors.some((e) => e.includes('name') && e.includes('required'))).toBe(true)
    })

    test('rejects empty name', () => {
      const data: ItemCreate = {
        name: '',
      }
      const result = service.validateForCreate(data)
      expect(result.valid).toBe(false)
      expect(result.errors.some((e) => e.includes('name'))).toBe(true)
    })

    test('rejects whitespace-only name', () => {
      const data: ItemCreate = {
        name: '   ',
      }
      const result = service.validateForCreate(data)
      expect(result.valid).toBe(false)
    })

    test('validates status is valid enum value', () => {
      const data: ItemCreate = {
        name: 'Valid Name',
        status: 'invalid-status',
      }
      const result = service.validateForCreate(data)
      expect(result.valid).toBe(false)
      expect(result.errors.some((e) => e.includes('status'))).toBe(true)
    })

    test('accepts all valid status values', () => {
      const validStatuses = ['active', 'pending', 'completed', 'urgent']
      
      for (const status of validStatuses) {
        const data: ItemCreate = {
          name: 'Valid Name',
          status,
        }
        const result = service.validateForCreate(data)
        expect(result.valid).toBe(true)
      }
    })

    test('enforces name length constraints', () => {
      const shortResult = service.validateForCreate({ name: 'a' })
      expect(shortResult.valid).toBe(true) // single char is valid

      const longResult = service.validateForCreate({ name: 'a'.repeat(201) })
      expect(longResult.valid).toBe(false)
      expect(longResult.errors.some((e) => e.includes('200'))).toBe(true)
    })

    test('enforces description length constraints', () => {
      const result = service.validateForCreate({
        name: 'Valid',
        description: 'x'.repeat(1001),
      })
      expect(result.valid).toBe(false)
      expect(result.errors.some((e) => e.includes('description') && e.includes('1000'))).toBe(true)
    })

    test('accepts empty description for optional field', () => {
      const result = service.validateForCreate({
        name: 'Valid Name',
        description: '',
      })
      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    test('accepts undefined status for optional field', () => {
      const result = service.validateForCreate({
        name: 'Valid Name',
        status: undefined,
      })
      expect(result.valid).toBe(true)
    })

    test('rejects name that becomes empty after trim', () => {
      const result = service.validateForCreate({
        name: '   \t   ',
      })
      expect(result.valid).toBe(false)
      expect(result.errors.some((e) => e.toLowerCase().includes('whitespace') || e.includes('empty'))).toBe(true)
    })
  })
})
