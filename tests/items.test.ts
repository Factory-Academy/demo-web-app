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
})
