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
      const item = { 
        id: '1',
        name: 'Task', 
        status: 'urgent', 
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
      const priority = service.calculatePriority(item)
      expect(['high', 'critical']).toContain(priority)
    })

    test('handles timezone-aware date comparison correctly', () => {
      const service = new ItemService()
      const fortyDaysAgo = new Date()
      fortyDaysAgo.setDate(fortyDaysAgo.getDate() - 40)
      
      const item = {
        id: '2',
        name: 'Old Task',
        status: 'urgent',
        createdAt: fortyDaysAgo.toISOString(),
        updatedAt: new Date().toISOString()
      }
      
      const priority = service.calculatePriority(item)
      expect(priority).toBe('critical') // 50 (urgent) + 20 (40 days * 0.5) = 70, but close to threshold
    })

    test('correctly calculates age for old items', () => {
      const service = new ItemService()
      const sixtyDaysAgo = new Date()
      sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60)
      
      const item = {
        id: '3',
        name: 'Very Old Task',
        status: 'urgent',
        createdAt: sixtyDaysAgo.toISOString(),
        updatedAt: new Date().toISOString()
      }
      
      const priority = service.calculatePriority(item)
      expect(priority).toBe('critical') // 50 (urgent) + 30 (60 days * 0.5) = 80
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
})
