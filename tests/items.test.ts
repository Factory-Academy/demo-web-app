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

  test('validate accepts urgent status', () => {
    const result = service.validate({ name: 'Test', status: 'urgent' })
    expect(result.valid).toBe(true)
  })

  test('calculatePriority handles timezone-naive dates correctly', () => {
    // Create a date from 35 days ago without timezone info
    const now = new Date()
    const thirtyFiveDaysAgo = new Date(now.getTime() - 35 * 86400000)
    // Remove the 'Z' to create a timezone-naive string
    const dateStringWithoutZ = thirtyFiveDaysAgo.toISOString().replace('Z', '')

    const item: Item = {
      id: '1',
      name: 'Test Item',
      status: 'normal',
      createdAt: dateStringWithoutZ,
      updatedAt: new Date().toISOString(),
    }

    const priority = service.calculatePriority(item)
    expect(priority).toBe('medium')
  })

  test('calculatePriority handles empty createdAt gracefully', () => {
    const item: Item = {
      id: '1',
      name: 'Test Item',
      status: 'normal',
      createdAt: '',
      updatedAt: new Date().toISOString(),
    }

    const priority = service.calculatePriority(item)
    expect(priority).toBe('low')
  })

  test('calculatePriority handles invalid date strings gracefully', () => {
    const item: Item = {
      id: '1',
      name: 'Test Item',
      status: 'normal',
      createdAt: 'invalid-date',
      updatedAt: new Date().toISOString(),
    }

    const priority = service.calculatePriority(item)
    expect(priority).toBe('low')
  })

  test('calculatePriority gives critical priority for urgent status with old date', () => {
    // Create a date from 35 days ago
    const now = new Date()
    const thirtyFiveDaysAgo = new Date(now.getTime() - 35 * 86400000)
    const dateString = thirtyFiveDaysAgo.toISOString()

    const item: Item = {
      id: '1',
      name: 'Test Item',
      status: 'urgent',
      createdAt: dateString,
      updatedAt: new Date().toISOString(),
    }

    const priority = service.calculatePriority(item)
    expect(priority).toBe('critical')
  })
})
