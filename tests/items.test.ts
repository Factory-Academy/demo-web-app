import { ItemService } from '../src/services/item-service'
import { Item } from '../src/models/item'
import { ValidationError } from '../src/utils/api-errors'

describe('ItemService', () => {
  const service = new ItemService()

  describe('validate', () => {
    test('rejects empty name', () => {
      const result = service.validate({ name: '' })
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Name is required')
    })

    test('accepts valid item', () => {
      const result = service.validate({ name: 'Test', status: 'active' })
      expect(result.valid).toBe(true)
    })

    test('throws ValidationError for invalid item in validateOrThrow', () => {
      expect(() => service.validateOrThrow({ name: '', status: 'bad' })).toThrow(ValidationError)
      expect(() => service.validateOrThrow({ name: '', status: 'bad' })).toThrow('Validation failed')
    })
  })

  describe('listItems', () => {
    const mockItems: Item[] = [
      {
        id: '1',
        name: 'Item 1',
        status: 'active',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      },
      {
        id: '2',
        name: 'Item 2',
        status: 'pending',
        createdAt: '2024-01-02T00:00:00Z',
        updatedAt: '2024-01-02T00:00:00Z',
      },
      {
        id: '3',
        name: 'Item 3',
        status: 'completed',
        createdAt: '2024-01-03T00:00:00Z',
        updatedAt: '2024-01-03T00:00:00Z',
      },
    ]

    test('returns all items when no pagination params', () => {
      const result = service.listItems(mockItems)
      expect(result.items).toHaveLength(3)
      expect(result.hasMore).toBe(false)
      expect(result.nextCursor).toBeNull()
    })

    test('returns paginated items with limit', () => {
      const result = service.listItems(mockItems, { limit: 2 })
      expect(result.items).toHaveLength(2)
      expect(result.items[0].id).toBe('1')
      expect(result.items[1].id).toBe('2')
      expect(result.hasMore).toBe(true)
      expect(result.nextCursor).toBe('2')
    })

    test('returns next page with cursor', () => {
      const result = service.listItems(mockItems, { cursor: '1', limit: 2 })
      expect(result.items).toHaveLength(2)
      expect(result.items[0].id).toBe('2')
      expect(result.items[1].id).toBe('3')
      expect(result.hasMore).toBe(false)
    })
  })

  test('calculatePriority uses UTC calendar-day comparison for age', () => {
    const nowSpy = jest
      .spyOn(Date, 'now')
      .mockReturnValue(new Date('2026-02-10T00:00:00.000Z').getTime())

    const result = service.calculatePriority({
      id: '1',
      name: 'Test',
      status: 'active',
      createdAt: '2026-01-01T23:59:59.000Z',
      updatedAt: '2026-01-01T23:59:59.000Z',
    })

    expect(result).toBe('medium')
    nowSpy.mockRestore()
  })
})
