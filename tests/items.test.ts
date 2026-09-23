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

  test('calculatePriority uses calendar-day age for timezone-offset timestamps', () => {
    const nowSpy = jest.spyOn(Date, 'now').mockReturnValue(Date.parse('2026-09-23T00:00:00.000Z'))

    const result = service.calculatePriority({
      id: '1',
      name: 'Test',
      status: 'active',
      createdAt: '2026-08-14T23:00:00+14:00',
      updatedAt: '2026-08-14T23:00:00+14:00',
    })

    expect(result).toBe('medium')
    nowSpy.mockRestore()
  })
})
