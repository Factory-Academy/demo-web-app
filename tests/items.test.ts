import { ItemService } from '../src/services/item-service'

describe('ItemService', () => {
  const service = new ItemService()

  test('validate rejects empty name', () => {
    const result = service.validate({ name: '' })
    expect(result.valid).toBe(false)
    expect(result.errors).toContain('Name is required')
  })

  test('validate accepts valid item', () => {
    const result = service.validate({ name: 'Test', status: 'active' })
    expect(result.valid).toBe(true)
  })

  test('validate tolerates missing input without throwing', () => {
    expect(() => service.validate(null)).not.toThrow()
    expect(service.validate(null).valid).toBe(false)
  })

  test('calculatePriority tolerates null and malformed records', () => {
    expect(service.calculatePriority(null)).toBe('low')
    expect(service.calculatePriority({ status: 'active', createdAt: 'bad' })).toBe('low')
  })

  test('normalize turns malformed input into a safe record', () => {
    const normalized = service.normalize({ name: '  Intake  ', status: 'archived' })
    expect(normalized.name).toBe('Intake')
    expect(normalized.status).toBe('active')
    expect(typeof normalized.createdAt).toBe('string')
  })

  test('normalized records validate cleanly', () => {
    const normalized = service.normalize({ name: 'Intake', status: 'urgent' })
    expect(service.validate(normalized).valid).toBe(true)
  })
})
