import { ItemService } from '../src/services/item-service'

describe('ItemService', () => {
  const service = new ItemService()

  describe('validate', () => {
    test('rejects empty name', () => {
      const result = service.validate({ name: '' })
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('name is required')
    })

    test('rejects undefined name', () => {
      const result = service.validate({})
      expect(result.valid).toBe(false)
      expect(result.errors.some((e) => e.includes('name'))).toBe(true)
    })

    test('accepts valid item with status', () => {
      const result = service.validate({ name: 'Test', status: 'active' })
      expect(result.valid).toBe(true)
      expect(result.errors.length).toBe(0)
    })

    test('accepts valid item with trimmed status', () => {
      const result = service.validate({ name: 'Test', status: '  pending  ' })
      expect(result.valid).toBe(true)
    })

    test('accepts valid item with description', () => {
      const result = service.validate({
        name: 'Test',
        status: 'active',
        description: 'A test item',
      })
      expect(result.valid).toBe(true)
    })

    test('accepts valid item with empty description', () => {
      const result = service.validate({
        name: 'Test',
        status: 'active',
        description: '',
      })
      expect(result.valid).toBe(true)
    })

    test('rejects invalid status', () => {
      const result = service.validate({ name: 'Test', status: 'invalid' })
      expect(result.valid).toBe(false)
      expect(result.errors.some((e) => e.includes('status'))).toBe(true)
    })

    test('rejects non-string description', () => {
      const result = service.validate({
        name: 'Test',
        status: 'active',
        description: 123 as unknown as string,
      })
      expect(result.valid).toBe(false)
      expect(result.errors.some((e) => e.includes('Value must be a string'))).toBe(true)
    })

    test('collects multiple errors', () => {
      const result = service.validate({ name: '', status: 'invalid' })
      expect(result.valid).toBe(false)
      expect(result.errors.length).toBeGreaterThanOrEqual(2)
    })
  })
})
