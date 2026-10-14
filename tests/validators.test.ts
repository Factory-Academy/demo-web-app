import {
  stringRequired,
  stringOptional,
  stringEnum,
  validate,
} from '../src/utils/validators'

describe('validators', () => {
  describe('stringRequired', () => {
    const validator = stringRequired('name')

    test('rejects empty string', () => {
      expect(validator('')).toBe('name is required')
    })

    test('rejects whitespace-only string', () => {
      expect(validator('   ')).toBe('name is required')
    })

    test('rejects undefined', () => {
      expect(validator(undefined)).toBe('name is required')
    })

    test('rejects null', () => {
      expect(validator(null)).toBe('name is required')
    })

    test('rejects non-string', () => {
      expect(validator(123)).toBe('name is required')
    })

    test('accepts valid string', () => {
      expect(validator('valid name')).toBeNull()
    })
  })

  describe('stringEnum', () => {
    const validator = stringEnum('status', ['active', 'pending', 'completed'])

    test('rejects invalid enum value', () => {
      const error = validator('invalid')
      expect(error).toContain('status must be one of')
      expect(error).toContain('active')
    })

    test('rejects non-string', () => {
      const error = validator(123)
      expect(error).toContain('status must be one of')
    })

    test('accepts valid enum value', () => {
      expect(validator('active')).toBeNull()
      expect(validator('pending')).toBeNull()
      expect(validator('completed')).toBeNull()
    })
  })

  describe('stringOptional', () => {
    const validator = stringOptional()

    test('accepts string', () => {
      expect(validator('value')).toBeNull()
    })

    test('accepts undefined', () => {
      expect(validator(undefined)).toBeNull()
    })

    test('accepts null', () => {
      expect(validator(null)).toBeNull()
    })

    test('rejects non-string value', () => {
      expect(validator(123)).toBe('Value must be a string')
      expect(validator({})).toBe('Value must be a string')
    })
  })

  describe('validate', () => {
    const schema = {
      name: stringRequired('name'),
      status: stringEnum('status', ['active', 'pending']),
      description: stringOptional(),
    }

    test('returns valid=true with no errors for correct data', () => {
      const result = validate(
        { name: 'test', status: 'active' },
        schema,
      )
      expect(result.valid).toBe(true)
      expect(result.errors).toEqual({})
    })

    test('collects multiple validation errors', () => {
      const result = validate(
        { name: '', status: 'invalid' },
        schema,
      )
      expect(result.valid).toBe(false)
      expect(result.errors.name).toBe('name is required')
      expect(result.errors.status).toContain('status must be one of')
    })

    test('ignores fields not in schema', () => {
      const result = validate(
        { name: 'test', status: 'active', extra: 'ignored' },
        schema,
      )
      expect(result.valid).toBe(true)
      expect(result.errors).toEqual({})
    })

    test('validates missing optional fields as valid', () => {
      const result = validate(
        { name: 'test', status: 'active' },
        schema,
      )
      expect(result.valid).toBe(true)
    })
  })
})
