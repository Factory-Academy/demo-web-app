import { ItemService } from '../src/services/item-service'
import { IFeatureFlagProvider } from '../src/models/feature-flag'

// Mock feature flag provider for testing
class MockFeatureFlagProvider implements IFeatureFlagProvider {
  private flags: Map<string, boolean> = new Map()

  setFlag(key: string, value: boolean): void {
    this.flags.set(key, value)
  }

  isEnabled(key: string): boolean {
    return this.flags.get(key) || false
  }

  isEnabledWithDefault(key: string, defaultValue: boolean): boolean {
    return this.flags.has(key) ? this.flags.get(key)! : defaultValue
  }

  getAllFlags(): Record<string, boolean> {
    return Object.fromEntries(this.flags)
  }
}

describe('ItemService', () => {
  describe('calculatePriority', () => {
    test('returns high priority for urgent items', () => {
      const service = new ItemService()
      const item = { name: 'Task', status: 'urgent' as const, createdAt: new Date() }
      const priority = service.calculatePriority(item)
      expect(['high', 'critical']).toContain(priority)
    })
  })

  describe('validate - basic validation', () => {
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

    test('validate rejects invalid status', () => {
      const result = service.validate({ name: 'Test', status: 'unknown' })
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Invalid status')
    })
  })

  describe('validate - enhanced validation feature flag', () => {
    test('applies enhanced validation when flag is enabled', () => {
      const mockFlags = new MockFeatureFlagProvider()
      mockFlags.setFlag('enhanced_validation', true)
      const service = new ItemService(mockFlags)

      const result = service.validate({ name: 'ab' })
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Name must be at least 3 characters')
    })

    test('skips enhanced validation when flag is disabled', () => {
      const mockFlags = new MockFeatureFlagProvider()
      mockFlags.setFlag('enhanced_validation', false)
      const service = new ItemService(mockFlags)

      const result = service.validate({ name: 'ab', status: 'active' })
      expect(result.valid).toBe(true)
      expect(result.errors.length).toBe(0)
    })

    test('enforces max name length when enhanced validation enabled', () => {
      const mockFlags = new MockFeatureFlagProvider()
      mockFlags.setFlag('enhanced_validation', true)
      const service = new ItemService(mockFlags)

      const longName = 'a'.repeat(101)
      const result = service.validate({ name: longName })
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Name must not exceed 100 characters')
    })

    test('enforces max description length when enhanced validation enabled', () => {
      const mockFlags = new MockFeatureFlagProvider()
      mockFlags.setFlag('enhanced_validation', true)
      const service = new ItemService(mockFlags)

      const longDescription = 'a'.repeat(501)
      const result = service.validate({ name: 'Valid Name', description: longDescription })
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Description must not exceed 500 characters')
    })

    test('allows valid item with enhanced validation enabled', () => {
      const mockFlags = new MockFeatureFlagProvider()
      mockFlags.setFlag('enhanced_validation', true)
      const service = new ItemService(mockFlags)

      const result = service.validate({ 
        name: 'Valid Item Name',
        description: 'A valid description',
        status: 'active'
      })
      expect(result.valid).toBe(true)
      expect(result.errors.length).toBe(0)
    })
  })

  describe('calculatePriority - caching', () => {
    test('caches priority calculations', () => {
      const service = new ItemService()
      const item = {
        id: '1',
        name: 'Task',
        status: 'urgent' as const,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      // First call calculates and caches
      const priority1 = service.calculatePriority(item)
      expect(['high', 'critical']).toContain(priority1)
      expect(service.getCacheSize()).toBe(1)

      // Second call should return cached value
      const priority2 = service.calculatePriority(item)
      expect(priority2).toBe(priority1)
      expect(service.getCacheSize()).toBe(1) // Still 1 entry
    })

    test('uses different cache entries for different items', () => {
      const service = new ItemService()
      const item1 = {
        id: '1',
        name: 'Task 1',
        status: 'urgent' as const,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      const item2 = {
        id: '2',
        name: 'Task 2',
        status: 'active' as const,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      service.calculatePriority(item1)
      service.calculatePriority(item2)
      expect(service.getCacheSize()).toBe(2)
    })

    test('uses cache key based on item id and status', () => {
      const service = new ItemService()
      const now = new Date().toISOString()
      const item1 = {
        id: '1',
        name: 'Task 1',
        status: 'urgent' as const,
        createdAt: now,
        updatedAt: now,
      }

      // First calculation
      const priority1 = service.calculatePriority(item1)

      // Change name but keep id and status same - should hit cache
      const item2 = { ...item1, name: 'Different Name' }
      const priority2 = service.calculatePriority(item2)
      
      // Results should be the same (from cache)
      expect(priority2).toBe(priority1)
      expect(service.getCacheSize()).toBe(1)
    })

    test('clears cache correctly', () => {
      const service = new ItemService()
      const item = {
        id: '1',
        name: 'Task',
        status: 'urgent' as const,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      service.calculatePriority(item)
      expect(service.getCacheSize()).toBe(1)

      service.clearCache()
      expect(service.getCacheSize()).toBe(0)

      // After clear, next call should recalculate
      service.calculatePriority(item)
      expect(service.getCacheSize()).toBe(1)
    })

    test('cache respects status changes in cache key', () => {
      const service = new ItemService()
      const now = new Date().toISOString()
      const baseItem = {
        id: '1',
        name: 'Task',
        createdAt: now,
        updatedAt: now,
      }

      const urgentItem = { ...baseItem, status: 'urgent' as const }
      const activeItem = { ...baseItem, status: 'active' as const }

      const urgentPriority = service.calculatePriority(urgentItem)
      const activePriority = service.calculatePriority(activeItem)

      // Different status should result in different cache entries
      expect(service.getCacheSize()).toBe(2)
      // Urgent items should have higher priority
      expect(['high', 'critical']).toContain(urgentPriority)
    })
  })
})
