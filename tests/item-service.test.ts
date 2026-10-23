import { ItemService } from '../src/services/item-service'
import { ValidationError } from '../src/utils/errors'

describe('ItemService', () => {
  const service = new ItemService()

  describe('validate', () => {
    test('throws ValidationError with empty name', () => {
      expect(() => service.validate({ name: '' })).toThrow(ValidationError)
      try {
        service.validate({ name: '' })
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError)
        expect((error as ValidationError).errors).toContain('Name is required')
      }
    })

    test('accepts valid item without throwing', () => {
      expect(() => service.validate({ name: 'Test', status: 'active' })).not.toThrow()
    })

    test('throws ValidationError with invalid status', () => {
      expect(() => service.validate({ name: 'Test', status: 'invalid' })).toThrow(
        ValidationError,
      )
      try {
        service.validate({ name: 'Test', status: 'invalid' })
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError)
        expect((error as ValidationError).errors).toContain('Invalid status')
      }
    })

    test('throws ValidationError with multiple failures', () => {
      expect(() => service.validate({ name: '', status: 'invalid' })).toThrow(
        ValidationError,
      )
      try {
        service.validate({ name: '', status: 'invalid' })
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError)
        const validationError = error as ValidationError
        expect(validationError.errors).toHaveLength(2)
        expect(validationError.errors).toContain('Name is required')
        expect(validationError.errors).toContain('Invalid status')
      }
    })

    test('accepts item with valid status', () => {
      expect(() => service.validate({ name: 'Test', status: 'active' })).not.toThrow()
      expect(() => service.validate({ name: 'Test', status: 'pending' })).not.toThrow()
      expect(() => service.validate({ name: 'Test', status: 'completed' })).not.toThrow()
    })

    test('accepts item without status', () => {
      expect(() => service.validate({ name: 'Test' })).not.toThrow()
    })
  })

  describe('isValid', () => {
    test('returns false for invalid data', () => {
      expect(service.isValid({ name: '' })).toBe(false)
      expect(service.isValid({ name: 'Test', status: 'invalid' })).toBe(false)
      expect(service.isValid({ name: '', status: 'invalid' })).toBe(false)
    })

    test('returns true for valid data', () => {
      expect(service.isValid({ name: 'Test', status: 'active' })).toBe(true)
      expect(service.isValid({ name: 'Test' })).toBe(true)
      expect(service.isValid({ name: 'Valid Item', status: 'pending' })).toBe(true)
    })
  })

  describe('calculatePriority', () => {
    test('returns critical for very old urgent items', () => {
      // Need baseScore >= 80: urgent (50) + ageDays * 0.5 >= 80
      // So ageDays * 0.5 >= 30, ageDays >= 60
      const oldDate = new Date(Date.now() - 61 * 86400000).toISOString()
      const item = {
        id: '1',
        name: 'Test',
        status: 'urgent',
        createdAt: oldDate,
        updatedAt: oldDate,
      }
      expect(service.calculatePriority(item)).toBe('critical')
    })

    test('returns high for urgent items', () => {
      const item = {
        id: '1',
        name: 'Test',
        status: 'urgent',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      expect(service.calculatePriority(item)).toBe('high')
    })

    test('returns low for recent non-urgent items', () => {
      const item = {
        id: '1',
        name: 'Test',
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      expect(service.calculatePriority(item)).toBe('low')
    })
  })
})
