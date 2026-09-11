import { 
  EnvFeatureFlagProvider, 
  FeatureFlagService, 
  IFeatureFlagProvider 
} from '../src/services/feature-flags'

describe('EnvFeatureFlagProvider', () => {
  const originalEnv = process.env

  beforeEach(() => {
    jest.resetModules()
    process.env = { ...originalEnv }
  })

  afterAll(() => {
    process.env = originalEnv
  })

  describe('isEnabled', () => {
    test('returns true for FEATURE_FLAG_X=true', () => {
      process.env.FEATURE_FLAG_TEST_FEATURE = 'true'
      const provider = new EnvFeatureFlagProvider()
      expect(provider.isEnabled('TEST_FEATURE')).toBe(true)
    })

    test('returns true for FEATURE_FLAG_X=1', () => {
      process.env.FEATURE_FLAG_TEST_FEATURE = '1'
      const provider = new EnvFeatureFlagProvider()
      expect(provider.isEnabled('TEST_FEATURE')).toBe(true)
    })

    test('returns false for FEATURE_FLAG_X=false', () => {
      process.env.FEATURE_FLAG_TEST_FEATURE = 'false'
      const provider = new EnvFeatureFlagProvider()
      expect(provider.isEnabled('TEST_FEATURE')).toBe(false)
    })

    test('returns false for FEATURE_FLAG_X=0', () => {
      process.env.FEATURE_FLAG_TEST_FEATURE = '0'
      const provider = new EnvFeatureFlagProvider()
      expect(provider.isEnabled('TEST_FEATURE')).toBe(false)
    })

    test('returns false when environment variable is not set', () => {
      const provider = new EnvFeatureFlagProvider()
      expect(provider.isEnabled('NONEXISTENT_FLAG')).toBe(false)
    })

    test('returns false for empty string', () => {
      process.env.FEATURE_FLAG_TEST_FEATURE = ''
      const provider = new EnvFeatureFlagProvider()
      expect(provider.isEnabled('TEST_FEATURE')).toBe(false)
    })

    test('handles case-insensitive values', () => {
      process.env.FEATURE_FLAG_TEST_FEATURE = 'TRUE'
      const provider = new EnvFeatureFlagProvider()
      expect(provider.isEnabled('TEST_FEATURE')).toBe(true)
    })

    test('trims whitespace from values', () => {
      process.env.FEATURE_FLAG_TEST_FEATURE = '  true  '
      const provider = new EnvFeatureFlagProvider()
      expect(provider.isEnabled('TEST_FEATURE')).toBe(true)
    })
  })

  describe('getRolloutPercentage', () => {
    test('returns percentage for valid FEATURE_FLAG_X_PERCENT value', () => {
      process.env.FEATURE_FLAG_TEST_PERCENT = '50'
      const provider = new EnvFeatureFlagProvider()
      expect(provider.getRolloutPercentage('TEST')).toBe(50)
    })

    test('returns 0 for FEATURE_FLAG_X_PERCENT=0', () => {
      process.env.FEATURE_FLAG_TEST_PERCENT = '0'
      const provider = new EnvFeatureFlagProvider()
      expect(provider.getRolloutPercentage('TEST')).toBe(0)
    })

    test('returns 100 for FEATURE_FLAG_X_PERCENT=100', () => {
      process.env.FEATURE_FLAG_TEST_PERCENT = '100'
      const provider = new EnvFeatureFlagProvider()
      expect(provider.getRolloutPercentage('TEST')).toBe(100)
    })

    test('returns undefined when not set', () => {
      const provider = new EnvFeatureFlagProvider()
      expect(provider.getRolloutPercentage('NONEXISTENT')).toBeUndefined()
    })

    test('returns undefined for invalid numeric value', () => {
      process.env.FEATURE_FLAG_TEST_PERCENT = 'invalid'
      const provider = new EnvFeatureFlagProvider()
      expect(provider.getRolloutPercentage('TEST')).toBeUndefined()
    })

    test('returns undefined for negative value', () => {
      process.env.FEATURE_FLAG_TEST_PERCENT = '-10'
      const provider = new EnvFeatureFlagProvider()
      expect(provider.getRolloutPercentage('TEST')).toBeUndefined()
    })

    test('returns undefined for value > 100', () => {
      process.env.FEATURE_FLAG_TEST_PERCENT = '150'
      const provider = new EnvFeatureFlagProvider()
      expect(provider.getRolloutPercentage('TEST')).toBeUndefined()
    })

    test('returns undefined for empty string', () => {
      process.env.FEATURE_FLAG_TEST_PERCENT = ''
      const provider = new EnvFeatureFlagProvider()
      expect(provider.getRolloutPercentage('TEST')).toBeUndefined()
    })
  })
})

describe('FeatureFlagService', () => {
  describe('with custom provider', () => {
    test('uses custom provider for isEnabled checks', () => {
      const mockProvider: IFeatureFlagProvider = {
        isEnabled: jest.fn().mockReturnValue(true),
        getRolloutPercentage: jest.fn().mockReturnValue(50)
      }
      
      const service = new FeatureFlagService(mockProvider)
      const result = service.isEnabled('TEST_FLAG')
      
      expect(result).toBe(true)
      expect(mockProvider.isEnabled).toHaveBeenCalledWith('TEST_FLAG')
    })

    test('uses custom provider for rollout percentage', () => {
      const mockProvider: IFeatureFlagProvider = {
        isEnabled: jest.fn().mockReturnValue(false),
        getRolloutPercentage: jest.fn().mockReturnValue(75)
      }
      
      const service = new FeatureFlagService(mockProvider)
      const result = service.getRollout('NEW_FEATURE')
      
      expect(result).toBe(75)
      expect(mockProvider.getRolloutPercentage).toHaveBeenCalledWith('NEW_FEATURE')
    })
  })

  describe('with default env provider', () => {
    const originalEnv = process.env

    beforeEach(() => {
      jest.resetModules()
      process.env = { ...originalEnv }
    })

    afterAll(() => {
      process.env = originalEnv
    })

    test('isEnhancedPriorityEnabled checks ENHANCED_PRIORITY flag', () => {
      process.env.FEATURE_FLAG_ENHANCED_PRIORITY = 'true'
      const service = new FeatureFlagService()
      expect(service.isEnhancedPriorityEnabled()).toBe(true)
    })

    test('isEnhancedPriorityEnabled returns false when not set', () => {
      const service = new FeatureFlagService()
      expect(service.isEnhancedPriorityEnabled()).toBe(false)
    })

    test('getRollout returns 0 when percentage not set', () => {
      const service = new FeatureFlagService()
      expect(service.getRollout('NONEXISTENT')).toBe(0)
    })

    test('getRollout returns percentage when set', () => {
      process.env.FEATURE_FLAG_GRADUAL_PERCENT = '30'
      const service = new FeatureFlagService()
      expect(service.getRollout('GRADUAL')).toBe(30)
    })

    test('generic isEnabled works with any flag name', () => {
      process.env.FEATURE_FLAG_CUSTOM_FEATURE = 'true'
      const service = new FeatureFlagService()
      expect(service.isEnabled('CUSTOM_FEATURE')).toBe(true)
    })
  })
})
