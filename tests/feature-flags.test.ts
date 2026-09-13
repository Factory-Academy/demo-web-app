import { EnvFeatureFlagProvider } from '../src/services/feature-flags'

describe('EnvFeatureFlagProvider', () => {
  const originalEnv = process.env

  beforeEach(() => {
    // Reset environment before each test
    process.env = { ...originalEnv }
  })

  afterAll(() => {
    // Restore original environment
    process.env = originalEnv
  })

  describe('isEnabled', () => {
    test('returns true when feature flag is set to true', () => {
      process.env.FEATURE_FLAG_TEST_FEATURE = 'true'
      const provider = new EnvFeatureFlagProvider()
      
      expect(provider.isEnabled('test_feature')).toBe(true)
    })

    test('returns false when feature flag is set to false', () => {
      process.env.FEATURE_FLAG_TEST_FEATURE = 'false'
      const provider = new EnvFeatureFlagProvider()
      
      expect(provider.isEnabled('test_feature')).toBe(false)
    })

    test('returns false when feature flag is not set', () => {
      const provider = new EnvFeatureFlagProvider()
      
      expect(provider.isEnabled('nonexistent_feature')).toBe(false)
    })

    test('handles case-insensitive key matching', () => {
      process.env.FEATURE_FLAG_MY_FEATURE = 'true'
      const provider = new EnvFeatureFlagProvider()
      
      expect(provider.isEnabled('my_feature')).toBe(true)
      expect(provider.isEnabled('MY_FEATURE')).toBe(true)
    })
  })

  describe('isEnabledWithDefault', () => {
    test('returns default value when feature flag is not set', () => {
      const provider = new EnvFeatureFlagProvider()
      
      expect(provider.isEnabledWithDefault('missing_flag', true)).toBe(true)
      expect(provider.isEnabledWithDefault('missing_flag', false)).toBe(false)
    })

    test('overrides default when feature flag is set', () => {
      process.env.FEATURE_FLAG_OVERRIDE = 'false'
      const provider = new EnvFeatureFlagProvider()
      
      expect(provider.isEnabledWithDefault('override', true)).toBe(false)
    })

    test('accepts various truthy values', () => {
      const provider = new EnvFeatureFlagProvider()
      
      process.env.FEATURE_FLAG_TEST1 = '1'
      expect(provider.isEnabled('test1')).toBe(true)
      
      process.env.FEATURE_FLAG_TEST2 = 'yes'
      expect(provider.isEnabled('test2')).toBe(true)
      
      process.env.FEATURE_FLAG_TEST3 = 'on'
      expect(provider.isEnabled('test3')).toBe(true)
      
      process.env.FEATURE_FLAG_TEST4 = 'TRUE'
      expect(provider.isEnabled('test4')).toBe(true)
    })

    test('treats unknown values as falsy', () => {
      process.env.FEATURE_FLAG_UNKNOWN = 'maybe'
      const provider = new EnvFeatureFlagProvider()
      
      expect(provider.isEnabled('unknown')).toBe(false)
    })
  })

  describe('getAllFlags', () => {
    test('returns empty object when no flags are set', () => {
      const provider = new EnvFeatureFlagProvider()
      const flags = provider.getAllFlags()
      
      expect(flags).toEqual({})
    })

    test('returns all configured feature flags', () => {
      process.env.FEATURE_FLAG_FEATURE_A = 'true'
      process.env.FEATURE_FLAG_FEATURE_B = 'false'
      process.env.FEATURE_FLAG_FEATURE_C = '1'
      const provider = new EnvFeatureFlagProvider()
      
      const flags = provider.getAllFlags()
      
      expect(flags).toEqual({
        feature_a: true,
        feature_b: false,
        feature_c: true,
      })
    })

    test('ignores non-feature-flag environment variables', () => {
      process.env.FEATURE_FLAG_MY_FLAG = 'true'
      process.env.OTHER_VAR = 'true'
      process.env.PATH = '/usr/bin'
      const provider = new EnvFeatureFlagProvider()
      
      const flags = provider.getAllFlags()
      
      expect(flags).toEqual({
        my_flag: true,
      })
    })

    test('supports custom prefix', () => {
      process.env.CUSTOM_PREFIX_FEATURE = 'true'
      const provider = new EnvFeatureFlagProvider('CUSTOM_PREFIX_')
      
      const flags = provider.getAllFlags()
      
      expect(flags).toEqual({
        feature: true,
      })
    })
  })

  describe('custom prefix', () => {
    test('uses custom prefix for flag lookup', () => {
      process.env.APP_FLAG_CUSTOM = 'true'
      const provider = new EnvFeatureFlagProvider('APP_FLAG_')
      
      expect(provider.isEnabled('custom')).toBe(true)
    })
  })
})
