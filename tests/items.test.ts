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

  test('paginate returns the correct items for page 2', () => {
    const items = ['a', 'b', 'c', 'd', 'e']
    const result = service.paginate(items, 2, 2)

    expect(result).toEqual(['c', 'd'])
  })
})
