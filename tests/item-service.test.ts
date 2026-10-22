import { ItemService } from '../src/services/item-service'
import { ValidationError } from '../src/lib/validation-error'
import { Item } from '../src/models/item'

describe('ItemService', () => {
  const service = new ItemService()

  describe('validate', () => {
    test('throws ValidationError for empty name', () => {
      expect(() => service.validate({ name: '' })).toThrow(ValidationError)
      expect(() => service.validate({ name: '' })).toThrow('Name is required')
    })

    test('throws ValidationError for invalid status', () => {
      expect(() => service.validate({ name: 'Test', status: 'invalid' })).toThrow(ValidationError)
      expect(() => service.validate({ name: 'Test', status: 'invalid' })).toThrow('Invalid status')
    })

    test('throws ValidationError with multiple errors', () => {
      try {
        service.validate({ name: '', status: 'invalid' })
        fail('Expected ValidationError to be thrown')
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError)
        const validationError = error as ValidationError
        expect(validationError.errors).toContain('Name is required')
        expect(validationError.errors).toContain('Invalid status')
      }
    })

    test('does not throw for valid item', () => {
      expect(() => service.validate({ name: 'Test', status: 'active' })).not.toThrow()
      expect(() => service.validate({ name: 'Test', status: 'pending' })).not.toThrow()
      expect(() => service.validate({ name: 'Test', status: 'completed' })).not.toThrow()
    })
  })

  describe('calculatePriority', () => {
    test('returns low priority for recent non-urgent item', () => {
      const item: Item = {
        id: '1',
        name: 'Test',
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      expect(service.calculatePriority(item)).toBe('low')
    })

    test('returns high priority for urgent item', () => {
      const item: Item = {
        id: '1',
        name: 'Test',
        status: 'urgent',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      expect(service.calculatePriority(item)).toBe('high')
    })

    test('returns critical priority for old urgent item', () => {
      const oldDate = new Date()
      oldDate.setDate(oldDate.getDate() - 60)
      const item: Item = {
        id: '1',
        name: 'Test',
        status: 'urgent',
        createdAt: oldDate.toISOString(),
        updatedAt: new Date().toISOString(),
      }
      expect(service.calculatePriority(item)).toBe('critical')
    })

    test('throws ValidationError for missing createdAt', () => {
      const item = {
        id: '1',
        name: 'Test',
        status: 'active',
        updatedAt: new Date().toISOString(),
      } as Item
      expect(() => service.calculatePriority(item)).toThrow(ValidationError)
      expect(() => service.calculatePriority(item)).toThrow('Record createdAt is required')
    })

    test('throws ValidationError for invalid createdAt', () => {
      const item: Item = {
        id: '1',
        name: 'Test',
        status: 'active',
        createdAt: 'invalid-date',
        updatedAt: new Date().toISOString(),
      }
      expect(() => service.calculatePriority(item)).toThrow(ValidationError)
      expect(() => service.calculatePriority(item)).toThrow('Invalid createdAt timestamp')
    })

    test('throws ValidationError for null record', () => {
      expect(() => service.calculatePriority(null as any)).toThrow(ValidationError)
      expect(() => service.calculatePriority(null as any)).toThrow('Record is required')
    })
  })
})
