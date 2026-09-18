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

  test('validate rejects invalid status', () => {
    const result = service.validate({ name: 'Draft item', status: 'archived' })
    expect(result.valid).toBe(false)
    expect(result.errors).toContain('Invalid status')
  })
})
