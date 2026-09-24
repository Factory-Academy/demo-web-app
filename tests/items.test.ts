import { ItemService } from '../src/services/item-service'
import { Item } from '../src/models/item'

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

  test('reduceItems handles empty array', () => {
    const result = service.reduceItems<number>([], (acc, item) => acc + 1, 0)
    expect(result).toBe(0)
  })

  test('reduceItems aggregates non-empty array', () => {
    const items: Item[] = [
      { id: '1', name: 'Item 1', status: 'active', createdAt: '2026-09-01', updatedAt: '2026-09-01' },
      { id: '2', name: 'Item 2', status: 'pending', createdAt: '2026-09-02', updatedAt: '2026-09-02' },
    ]
    const result = service.reduceItems<number>(items, (acc, item) => acc + 1, 0)
    expect(result).toBe(2)
  })
})
