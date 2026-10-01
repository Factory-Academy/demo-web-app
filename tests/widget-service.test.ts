import { WidgetService } from '../src/services/widget-service'

describe('WidgetService', () => {
  const service = new WidgetService()

  describe('validate', () => {
    test('rejects empty name', () => {
      const result = service.validate({ name: '' })
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Name is required')
    })

    test('rejects missing name', () => {
      const result = service.validate({ priority: 5 })
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Name is required')
    })

    test('rejects priority below 0', () => {
      const result = service.validate({ name: 'Test Widget', priority: -1 })
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Priority must be between 0 and 10')
    })

    test('rejects priority above 10', () => {
      const result = service.validate({ name: 'Test Widget', priority: 11 })
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Priority must be between 0 and 10')
    })

    test('accepts valid widget with all fields', () => {
      const result = service.validate({ 
        name: 'Test Widget', 
        itemId: '123',
        priority: 5 
      })
      expect(result.valid).toBe(true)
      expect(result.errors).toEqual([])
    })

    test('accepts valid widget with minimal fields', () => {
      const result = service.validate({ name: 'Test Widget' })
      expect(result.valid).toBe(true)
    })
  })

  describe('calculatePriority', () => {
    test('returns low priority for recent low-priority widget', () => {
      const widget = {
        id: '1',
        name: 'Test',
        itemId: '123',
        priority: 3,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
      expect(service.calculatePriority(widget)).toBe('low')
    })

    test('returns high priority for high-priority widget', () => {
      const widget = {
        id: '1',
        name: 'Test',
        itemId: '123',
        priority: 8,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
      expect(service.calculatePriority(widget)).toBe('high')
    })

    test('returns critical priority for old high-priority widget', () => {
      const sixtyDaysAgo = new Date(Date.now() - 60 * 86400000).toISOString()
      const widget = {
        id: '1',
        name: 'Test',
        itemId: '123',
        priority: 8,
        createdAt: sixtyDaysAgo,
        updatedAt: sixtyDaysAgo
      }
      expect(service.calculatePriority(widget)).toBe('critical')
    })
  })
})
