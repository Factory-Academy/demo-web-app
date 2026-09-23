import { WidgetService } from '../src/services/widget-service'

describe('WidgetService', () => {
  const service = new WidgetService()

  test('validate rejects empty name', () => {
    const result = service.validate({ name: '', itemId: '1' })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.errors).toContain('Widget name is required')
    }
  })

  test('validate rejects missing itemId', () => {
    const result = service.validate({ name: 'Widget' } as any)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.errors).toContain('Item ID is required')
    }
  })

  test('create returns successful widget', () => {
    const result = service.create({ name: 'Widget', itemId: '123', priority: 10 })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.name).toBe('Widget')
      expect(result.data.itemId).toBe('123')
      expect(result.data.priority).toBe(10)
    }
  })
})
