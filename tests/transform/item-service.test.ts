import { ItemService } from '@/services/item-service'

describe('ItemService facade', () => {
  const service = new ItemService()

  test('delegates priority calculation', () => {
    const createdAt = new Date().toISOString()
    expect(service.calculatePriority({ status: 'urgent', createdAt })).toBe('high')
  })

  test('delegates batch priority calculation', () => {
    const createdAt = new Date().toISOString()
    const levels = service.calculatePriorities([
      { status: 'urgent', createdAt },
      { status: 'active', createdAt },
    ])
    expect(levels).toEqual(['high', 'low'])
  })

  test('delegates validation and preserves the result shape', () => {
    const result = service.validate({ name: 'Test', status: 'active' })
    expect(result).toEqual({ valid: true, errors: [] })
  })

  test('does not throw on malformed input', () => {
    expect(() => service.calculatePriority({ createdAt: 'not-a-date' })).not.toThrow()
    expect(() => service.validate({ name: 42 as unknown as string })).not.toThrow()
  })
})
