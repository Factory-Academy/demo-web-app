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

  describe('formatList', () => {
    const mockItems: Item[] = [
      {
        id: '1',
        name: 'First Item',
        description: 'A detailed description',
        status: 'active',
        createdAt: '2024-01-01',
        updatedAt: '2024-01-02',
      },
      {
        id: '2',
        name: 'Second Item',
        status: 'pending',
        createdAt: '2024-01-03',
        updatedAt: '2024-01-04',
      },
    ]

    test('returns empty message for empty list', () => {
      const result = service.formatList([])
      expect(result).toBe('No items found.')
    })

    test('formats items in normal mode with descriptions', () => {
      const result = service.formatList(mockItems)
      expect(result).toContain('First Item [active]')
      expect(result).toContain('A detailed description')
      expect(result).toContain('Second Item [pending]')
    })

    test('formats items in compact mode without descriptions', () => {
      const result = service.formatList(mockItems, { compact: true })
      expect(result).toContain('First Item [active]')
      expect(result).not.toContain('A detailed description')
      expect(result).toContain('Second Item [pending]')
    })

    test('shows status in both modes', () => {
      const normalResult = service.formatList(mockItems)
      const compactResult = service.formatList(mockItems, { compact: true })
      
      expect(normalResult).toContain('[active]')
      expect(normalResult).toContain('[pending]')
      expect(compactResult).toContain('[active]')
      expect(compactResult).toContain('[pending]')
    })
  })
})
