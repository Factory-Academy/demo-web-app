import { FeatureFlags } from '../src/services/feature-flags'

describe('FeatureFlags', () => {
  let flags: FeatureFlags

  beforeEach(() => {
    // Save original env
    const originalEnv = process.env

    // Clear all NEXT_PUBLIC_FEATURE_ vars before each test
    Object.keys(process.env).forEach((key) => {
      if (key.startsWith('NEXT_PUBLIC_FEATURE_')) {
        delete process.env[key]
      }
    })

    // Create new instance for each test
    flags = new FeatureFlags()

    // Restore env after each test
    process.env = originalEnv
  })

  describe('isEnabled', () => {
    test('returns false for non-existent flag', () => {
      expect(flags.isEnabled('nonexistent')).toBe(false)
    })

    test('returns true for enabled flag', () => {
      process.env.NEXT_PUBLIC_FEATURE_TEST_FLAG = 'true'
      flags = new FeatureFlags()
      expect(flags.isEnabled('test_flag')).toBe(true)
    })

    test('returns false for disabled flag', () => {
      process.env.NEXT_PUBLIC_FEATURE_TEST_FLAG = 'false'
      flags = new FeatureFlags()
      expect(flags.isEnabled('test_flag')).toBe(false)
    })

    test('handles case-insensitive flag names', () => {
      process.env.NEXT_PUBLIC_FEATURE_MY_FEATURE = 'true'
      flags = new FeatureFlags()
      expect(flags.isEnabled('MY_FEATURE')).toBe(true)
      expect(flags.isEnabled('my_feature')).toBe(true)
      expect(flags.isEnabled('My_Feature')).toBe(true)
    })

    test('parses various boolean string values', () => {
      const testCases = [
        ['true', true],
        ['false', false],
        ['1', true],
        ['0', false],
        ['yes', true],
        ['no', false],
        ['on', true],
        ['off', false],
        ['', false],
      ] as [string, boolean][]

      testCases.forEach(([value, expected]) => {
        delete process.env.NEXT_PUBLIC_FEATURE_BOOL_TEST
        process.env.NEXT_PUBLIC_FEATURE_BOOL_TEST = value
        flags = new FeatureFlags()
        expect(flags.isEnabled('bool_test')).toBe(expected)
      })
    })
  })

  describe('getEnabledFlags', () => {
    test('returns empty array when no flags enabled', () => {
      expect(flags.getEnabledFlags()).toEqual([])
    })

    test('returns list of enabled flags', () => {
      process.env.NEXT_PUBLIC_FEATURE_FEATURE_A = 'true'
      process.env.NEXT_PUBLIC_FEATURE_FEATURE_B = 'false'
      process.env.NEXT_PUBLIC_FEATURE_FEATURE_C = 'true'
      flags = new FeatureFlags()

      const enabled = flags.getEnabledFlags()
      expect(enabled).toContain('feature_a')
      expect(enabled).toContain('feature_c')
      expect(enabled).not.toContain('feature_b')
      expect(enabled.length).toBe(2)
    })
  })

  describe('getAllFlags', () => {
    test('returns all loaded flags with values', () => {
      process.env.NEXT_PUBLIC_FEATURE_FLAG_ONE = 'true'
      process.env.NEXT_PUBLIC_FEATURE_FLAG_TWO = 'false'
      flags = new FeatureFlags()

      const all = flags.getAllFlags()
      expect(all).toEqual({
        flag_one: true,
        flag_two: false,
      })
    })

    test('returns copy of flags (not reference)', () => {
      process.env.NEXT_PUBLIC_FEATURE_IMMUTABLE_TEST = 'true'
      flags = new FeatureFlags()

      const flags1 = flags.getAllFlags()
      const flags2 = flags.getAllFlags()

      expect(flags1).toEqual(flags2)
      expect(flags1).not.toBe(flags2) // Different references
    })
  })

  describe('flag prefix filtering', () => {
    test('ignores env vars without NEXT_PUBLIC_FEATURE_ prefix', () => {
      process.env.FEATURE_FLAG = 'true'
      process.env.MY_FLAG = 'true'
      process.env.NEXT_PUBLIC_OTHER = 'true'
      flags = new FeatureFlags()

      expect(flags.getAllFlags()).toEqual({})
    })

    test('only processes NEXT_PUBLIC_FEATURE_ prefixed vars', () => {
      process.env.NEXT_PUBLIC_FEATURE_VALID = 'true'
      process.env.NEXT_PUBLIC_FEATURE_ALSO_VALID = 'true'
      process.env.SOME_OTHER_VAR = 'true'
      flags = new FeatureFlags()

      const all = flags.getAllFlags()
      expect(Object.keys(all)).toContain('valid')
      expect(Object.keys(all)).toContain('also_valid')
      expect(Object.keys(all).length).toBe(2)
    })
  })
})
