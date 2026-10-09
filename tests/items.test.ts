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

  describe('calculatePriority with advanced_priority flag', () => {
    const baseItem: Item = {
      id: '1',
      name: 'Test Item',
      status: 'active',
      createdAt: new Date(Date.now() - 40 * 86400000).toISOString(), // 40 days old
      updatedAt: new Date().toISOString(),
    }

    beforeEach(() => {
      // Clear feature flag
      delete process.env.NEXT_PUBLIC_FEATURE_ADVANCED_PRIORITY
    })

    test('calculatePriority without advanced flag ignores description', () => {
      const itemWithDesc: Item = {
        ...baseItem,
        description: 'A'.repeat(150), // Long description (> 100 chars)
      }
      const priority = service.calculatePriority(itemWithDesc)
      // baseScore = 20 (40 days * 0.5) = 20, no bonus for description
      expect(priority).toBe('medium') // 20 >= 20
    })

    test('calculatePriority with advanced flag boosts long descriptions', () => {
      process.env.NEXT_PUBLIC_FEATURE_ADVANCED_PRIORITY = 'true'
      const newService = new ItemService()

      const itemWithDesc: Item = {
        ...baseItem,
        description: 'A'.repeat(150), // Long description (> 100 chars)
      }

      const priority = newService.calculatePriority(itemWithDesc)
      // baseScore = 20 (40 days * 0.5) + 10 (long desc with flag) = 30
      expect(priority).toBe('medium')
    })

    test('calculatePriority with advanced flag reduces completed items', () => {
      process.env.NEXT_PUBLIC_FEATURE_ADVANCED_PRIORITY = 'true'
      const newService = new ItemService()

      const completedItem: Item = {
        ...baseItem,
        status: 'completed',
      }

      const priority = newService.calculatePriority(completedItem)
      // baseScore = 20 (40 days * 0.5) - 30 (completed) = -10
      expect(priority).toBe('low')
    })
  })
})
