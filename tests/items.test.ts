import { Item } from '../src/models/item'
import { ItemService } from '../src/services/item-service'

describe('ItemService', () => {
  const service = new ItemService()

  const createItem = (overrides: Partial<Item> = {}): Item => ({
    id: 'item-1',
    name: 'Test item',
    status: 'active',
    createdAt: '2024-02-10T00:00:00.000Z',
    updatedAt: '2024-03-01T00:00:00.000Z',
    ...overrides,
  })

  describe('calculatePriority', () => {
    beforeAll(() => {
      jest.useFakeTimers()
      jest.setSystemTime(new Date('2024-03-01T00:00:00.000Z'))
    })

    afterAll(() => {
      jest.useRealTimers()
    })

    test.each([
      ['low', createItem()],
      ['medium', createItem({ createdAt: '2024-01-21T00:00:00.000Z' })],
      ['high', createItem({ status: 'urgent' })],
      [
        'critical',
        createItem({
          status: 'urgent',
          createdAt: '2023-12-22T00:00:00.000Z',
        }),
      ],
    ] as const)('returns %s priority for the record', (expected, item) => {
      expect(service.calculatePriority(item)).toBe(expected)
    })
  })

  test('validate rejects a missing name', () => {
    const result = service.validate({})

    expect(result).toEqual({
      valid: false,
      errors: ['Name is required'],
    })
  })

  test('validate rejects a blank name', () => {
    const result = service.validate({ name: '   ' })

    expect(result.valid).toBe(false)
    expect(result.errors).toContain('Name is required')
  })

  test('validate rejects an unsupported status', () => {
    const result = service.validate({ name: 'Test', status: 'archived' })

    expect(result).toEqual({
      valid: false,
      errors: ['Invalid status'],
    })
  })

  test('validate accepts valid item', () => {
    const result = service.validate({ name: 'Test', status: 'active' })

    expect(result).toEqual({ valid: true, errors: [] })
  })
})
