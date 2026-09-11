import { ItemService } from '../src/services/item-service'
import { FeatureFlagService, IFeatureFlagProvider } from '../src/services/feature-flags'

describe('ItemService', () => {
  const service = new ItemService()

  describe('calculatePriority', () => {
    test('returns high priority for urgent items', () => {
      const item = { name: 'Task', status: 'urgent' as const, createdAt: new Date().toISOString() }
      const priority = service.calculatePriority(item)
      expect(['high', 'critical']).toContain(priority)
    })

    test('uses standard calculation by default', () => {
      const item = { 
        name: 'Task', 
        status: 'pending' as const, 
        createdAt: new Date().toISOString() 
      }
      const priority = service.calculatePriority(item)
      expect(priority).toBe('low')
    })
  })

  describe('calculatePriority with enhanced mode', () => {
    test('uses enhanced calculation when feature flag is enabled', () => {
      const mockProvider: IFeatureFlagProvider = {
        isEnabled: jest.fn().mockReturnValue(true),
        getRolloutPercentage: jest.fn()
      }
      const flags = new FeatureFlagService(mockProvider)
      const service = new ItemService(flags)

      const item = { 
        name: 'Task', 
        status: 'pending' as const, 
        createdAt: new Date().toISOString() 
      }
      const priority = service.calculatePriority(item)
      
      // In enhanced mode, pending status gets 30 points (medium threshold is 25)
      expect(priority).toBe('medium')
      expect(mockProvider.isEnabled).toHaveBeenCalledWith('ENHANCED_PRIORITY')
    })

    test('enhanced mode scores urgent items higher', () => {
      const mockProvider: IFeatureFlagProvider = {
        isEnabled: jest.fn().mockReturnValue(true),
        getRolloutPercentage: jest.fn()
      }
      const flags = new FeatureFlagService(mockProvider)
      const service = new ItemService(flags)

      const item = { 
        name: 'Task', 
        status: 'urgent' as const, 
        createdAt: new Date().toISOString() 
      }
      const priority = service.calculatePriority(item)
      
      // Enhanced mode: urgent=60 points (>= 55 = high)
      expect(priority).toBe('high')
    })

    test('enhanced mode accounts for age with improved granularity', () => {
      const mockProvider: IFeatureFlagProvider = {
        isEnabled: jest.fn().mockReturnValue(true),
        getRolloutPercentage: jest.fn()
      }
      const flags = new FeatureFlagService(mockProvider)
      const service = new ItemService(flags)

      // 65 days old + urgent status
      const oldDate = new Date()
      oldDate.setDate(oldDate.getDate() - 65)
      
      const item = { 
        name: 'Task', 
        status: 'urgent' as const, 
        createdAt: oldDate.toISOString() 
      }
      const priority = service.calculatePriority(item)
      
      // Enhanced mode: urgent=60 + age>60=40 = 100 (>= 85 = critical)
      expect(priority).toBe('critical')
    })
  })

  describe('validate', () => {
    test('validate rejects empty name', () => {
      const result = service.validate({ name: '' })
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Name is required')
    })

    test('validate accepts valid item', () => {
      const result = service.validate({ name: 'Test', status: 'active' })
      expect(result.valid).toBe(true)
    })
  })
})
