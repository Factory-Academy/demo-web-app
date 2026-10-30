import { WidgetService } from '../src/services/widget-service'

describe('WidgetService', () => {
  const service = new WidgetService()

  describe('validate', () => {
    test('rejects empty name', () => {
      const result = service.validate({ name: '' })
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Name is required')
    })

    test('rejects empty itemId', () => {
      const result = service.validate({ itemId: '' })
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Item ID is required')
    })

    test('accepts valid widget with name and itemId', () => {
      const result = service.validate({ name: 'Test Widget', itemId: '123' })
      expect(result.valid).toBe(true)
      expect(result.errors).toEqual([])
    })

    test('collects multiple errors', () => {
      const result = service.validate({ name: '', itemId: '  ' })
      expect(result.valid).toBe(false)
      expect(result.errors).toHaveLength(2)
      expect(result.errors).toContain('Name is required')
      expect(result.errors).toContain('Item ID is required')
    })

    test('trims whitespace before validation', () => {
      const result = service.validate({ name: '  Valid  ', itemId: '  456  ' })
      expect(result.valid).toBe(true)
      expect(result.errors).toEqual([])
    })

    test('accepts widget with optional fields', () => {
      const result = service.validate({ name: 'Widget', itemId: 'item-1', priority: 5 })
      expect(result.valid).toBe(true)
    })
  })
})
