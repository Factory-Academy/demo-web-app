import { ItemService } from '../src/services/item-service'
import { Item } from '../src/models/item'

describe('ItemService', () => {
  const service = new ItemService()

  describe('validate', () => {
    test('rejects empty name', () => {
      const result = service.validate({ name: '' })
      expect(result.success).toBe(false)
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0]).toMatchObject({
        field: 'name',
        message: 'Name is required',
        code: 'MISSING_NAME',
      })
    })

    test('rejects invalid status', () => {
      const result = service.validate({ name: 'Test', status: 'invalid' })
      expect(result.success).toBe(false)
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0]).toMatchObject({
        field: 'status',
        code: 'INVALID_STATUS',
      })
    })

    test('accepts valid item', () => {
      const result = service.validate({ name: 'Test', status: 'active' })
      expect(result.success).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    test('accumulates multiple errors', () => {
      const result = service.validate({ name: '', status: 'invalid' })
      expect(result.success).toBe(false)
      expect(result.errors).toHaveLength(2)
    })
  })

  describe('calculatePriority', () => {
    test('returns low priority for recent active items', () => {
      const item: Item = {
        id: '1',
        name: 'Test',
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      const result = service.calculatePriority(item)
      expect(result.success).toBe(true)
      expect(result.data).toBe('low')
    })

    test('returns high priority for urgent items', () => {
      const item: Item = {
        id: '1',
        name: 'Test',
        status: 'urgent',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      const result = service.calculatePriority(item)
      expect(result.success).toBe(true)
      expect(result.data).toBe('high')
    })

    test('returns critical priority for old urgent items', () => {
      const oldDate = new Date()
      oldDate.setDate(oldDate.getDate() - 70)
      const item: Item = {
        id: '1',
        name: 'Test',
        status: 'urgent',
        createdAt: oldDate.toISOString(),
        updatedAt: new Date().toISOString(),
      }
      const result = service.calculatePriority(item)
      expect(result.success).toBe(true)
      expect(result.data).toBe('critical')
    })

    test('rejects missing createdAt', () => {
      const item = {
        id: '1',
        name: 'Test',
        status: 'active',
        createdAt: '',
        updatedAt: new Date().toISOString(),
      } as Item
      const result = service.calculatePriority(item)
      expect(result.success).toBe(false)
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0]).toMatchObject({
        field: 'createdAt',
        code: 'MISSING_CREATED_AT',
      })
    })

    test('rejects invalid date format', () => {
      const item: Item = {
        id: '1',
        name: 'Test',
        status: 'active',
        createdAt: 'not-a-date',
        updatedAt: new Date().toISOString(),
      }
      const result = service.calculatePriority(item)
      expect(result.success).toBe(false)
      expect(result.errors[0]).toMatchObject({
        field: 'createdAt',
        code: 'INVALID_DATE',
      })
    })

    test('rejects invalid status', () => {
      const item: Item = {
        id: '1',
        name: 'Test',
        status: 'invalid-status',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      const result = service.calculatePriority(item)
      expect(result.success).toBe(false)
      expect(result.errors[0]).toMatchObject({
        field: 'status',
        code: 'INVALID_STATUS',
      })
    })
  })
})
