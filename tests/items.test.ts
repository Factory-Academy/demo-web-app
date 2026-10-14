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
