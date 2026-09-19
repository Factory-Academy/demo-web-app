import { ItemService } from '../src/services/item-service'
import { appConfig } from '../src/config/app-config'
import { Item } from '../src/models/item'

describe('ItemService', () => {
  const service = new ItemService()

  describe('validate', () => {
    test('rejects empty name', () => {
      const result = service.validate({ name: '' })
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Name is required')
    })

    test('accepts valid item with active status', () => {
      const result = service.validate({ name: 'Test', status: appConfig.itemStatus.ACTIVE })
      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    test('accepts valid item with all valid statuses', () => {
      appConfig.validItemStatuses.forEach((status) => {
        const result = service.validate({ name: 'Test', status })
        expect(result.valid).toBe(true)
      })
    })

    test('rejects invalid status', () => {
      const result = service.validate({ name: 'Test', status: 'invalid-status' })
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Invalid status')
    })

    test('rejects urgent status as invalid', () => {
      const result = service.validate({ name: 'Test', status: appConfig.itemStatus.URGENT })
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Invalid status')
    })

    test('allows status to be optional', () => {
      const result = service.validate({ name: 'Test' })
      expect(result.valid).toBe(true)
    })
  })

  describe('calculatePriority', () => {
    const createItem = (overrides?: Partial<Item>): Item => ({
      id: '1',
      name: 'Test',
      status: appConfig.itemStatus.ACTIVE,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...overrides,
    })

    test('returns low priority for recent items', () => {
      const item = createItem()
      const priority = service.calculatePriority(item)
      expect(priority).toBe(appConfig.priorityLevel.LOW)
    })

    test('returns high priority for urgent items', () => {
      const item = createItem({ status: appConfig.itemStatus.URGENT })
      const priority = service.calculatePriority(item)
      expect(priority).toBe(appConfig.priorityLevel.HIGH)
    })

    test('returns critical priority for very old urgent items', () => {
      // Urgent base score: 50. To reach 80, need 30 more points
      // Age multiplier: 0.5, so need 60 days old to get 30 points
      const item = createItem({
        status: appConfig.itemStatus.URGENT,
        createdAt: new Date(Date.now() - 65 * 86400000).toISOString(), // 65 days old
      })
      const priority = service.calculatePriority(item)
      expect(priority).toBe(appConfig.priorityLevel.CRITICAL)
    })

    test('returns medium priority for old non-urgent items', () => {
      // Age: 35 days = 35 * 0.5 = 17.5 score (just under MEDIUM threshold of 20)
      const item = createItem({
        createdAt: new Date(Date.now() - 50 * 86400000).toISOString(), // 50 days old
      })
      const priority = service.calculatePriority(item)
      expect(priority).toBe(appConfig.priorityLevel.MEDIUM)
    })

    test('respects priority thresholds from config', () => {
      // Create items at specific score boundaries
      // Urgent item with base score 50 should be HIGH (threshold: 50)
      const urgentItem = createItem({ status: appConfig.itemStatus.URGENT })
      expect(service.calculatePriority(urgentItem)).toBe(appConfig.priorityLevel.HIGH)

      // Non-urgent item 40 days old: 40*0.5 = 20 score = MEDIUM (threshold >= 20)
      const mediumItem = createItem({
        createdAt: new Date(Date.now() - 40 * 86400000).toISOString(),
      })
      expect(service.calculatePriority(mediumItem)).toBe(appConfig.priorityLevel.MEDIUM)
    })

    test('uses milliseconds per day from config', () => {
      const millisPerDay = appConfig.ageScoring.MILLISECONDS_PER_DAY
      expect(millisPerDay).toBe(86400000)

      const item = createItem({
        createdAt: new Date(Date.now() - millisPerDay).toISOString(), // Exactly 1 day old
      })
      // Should be low priority (0 score, age not > 30 days)
      const priority = service.calculatePriority(item)
      expect(priority).toBe(appConfig.priorityLevel.LOW)
    })
  })
})
