import { validators, validate, createValidator, ObjectSchema } from '../src/utils/validate'

describe('validators', () => {
  describe('string', () => {
    test('validates string type', () => {
      const validator = validators.string()
      expect(validator('hello', 'field')).toBeNull()
      expect(validator(123, 'field')).toBe('field must be a string')
      expect(validator(null, 'field')).toBe('field must be a string')
    })

    test('validates minimum length', () => {
      const validator = validators.string({ minLength: 3 })
      expect(validator('ab', 'field')).toBe('field must be at least 3 characters')
      expect(validator('abc', 'field')).toBeNull()
      expect(validator('abcd', 'field')).toBeNull()
    })

    test('validates maximum length', () => {
      const validator = validators.string({ maxLength: 5 })
      expect(validator('123456', 'field')).toBe('field must be at most 5 characters')
      expect(validator('12345', 'field')).toBeNull()
      expect(validator('1234', 'field')).toBeNull()
    })

    test('validates pattern', () => {
      const validator = validators.string({ pattern: /^[a-z]+$/ })
      expect(validator('abc', 'field')).toBeNull()
      expect(validator('abc123', 'field')).toBe('field has invalid format')
      expect(validator('ABC', 'field')).toBe('field has invalid format')
    })

    test('validates combined constraints', () => {
      const validator = validators.string({ minLength: 2, maxLength: 5, pattern: /^[0-9]+$/ })
      expect(validator('1', 'field')).toBe('field must be at least 2 characters')
      expect(validator('123456', 'field')).toBe('field must be at most 5 characters')
      expect(validator('abc', 'field')).toBe('field has invalid format')
      expect(validator('123', 'field')).toBeNull()
    })
  })

  describe('number', () => {
    test('validates number type', () => {
      const validator = validators.number()
      expect(validator(42, 'field')).toBeNull()
      expect(validator(0, 'field')).toBeNull()
      expect(validator(-10, 'field')).toBeNull()
      expect(validator('123', 'field')).toBe('field must be a number')
      expect(validator(NaN, 'field')).toBe('field must be a number')
    })

    test('rejects Infinity and -Infinity', () => {
      const validator = validators.number()
      expect(validator(Infinity, 'field')).toBe('field must be a number')
      expect(validator(-Infinity, 'field')).toBe('field must be a number')
    })

    test('validates integer constraint', () => {
      const validator = validators.number({ integer: true })
      expect(validator(42, 'field')).toBeNull()
      expect(validator(42.5, 'field')).toBe('field must be an integer')
    })

    test('validates min constraint', () => {
      const validator = validators.number({ min: 10 })
      expect(validator(9, 'field')).toBe('field must be at least 10')
      expect(validator(10, 'field')).toBeNull()
      expect(validator(11, 'field')).toBeNull()
    })

    test('validates max constraint', () => {
      const validator = validators.number({ max: 100 })
      expect(validator(101, 'field')).toBe('field must be at most 100')
      expect(validator(100, 'field')).toBeNull()
      expect(validator(99, 'field')).toBeNull()
    })

    test('validates combined constraints', () => {
      const validator = validators.number({ min: 0, max: 10, integer: true })
      expect(validator(-1, 'field')).toBe('field must be at least 0')
      expect(validator(11, 'field')).toBe('field must be at most 10')
      expect(validator(5.5, 'field')).toBe('field must be an integer')
      expect(validator(5, 'field')).toBeNull()
    })
  })

  describe('boolean', () => {
    test('validates boolean type', () => {
      const validator = validators.boolean()
      expect(validator(true, 'field')).toBeNull()
      expect(validator(false, 'field')).toBeNull()
      expect(validator('true', 'field')).toBe('field must be a boolean')
      expect(validator(1, 'field')).toBe('field must be a boolean')
    })
  })

  describe('enum', () => {
    test('validates enum values', () => {
      const validator = validators.enum(['red', 'green', 'blue'])
      expect(validator('red', 'field')).toBeNull()
      expect(validator('green', 'field')).toBeNull()
      expect(validator('yellow', 'field')).toBe('field must be one of: red, green, blue')
    })

    test('validates numeric enum values', () => {
      const validator = validators.enum([1, 2, 3])
      expect(validator(1, 'field')).toBeNull()
      expect(validator(4, 'field')).toBe('field must be one of: 1, 2, 3')
    })

    test('rejects values when enum array is empty', () => {
      const validator = validators.enum([])
      expect(validator('anything', 'field')).toBe('field has no valid options')
    })
  })

  describe('date', () => {
    test('validates date strings', () => {
      const validator = validators.date()
      expect(validator('2023-10-23', 'field')).toBeNull()
      expect(validator('2023-10-23T10:30:00Z', 'field')).toBeNull()
      expect(validator('invalid-date', 'field')).toBe('field must be a valid date')
      expect(validator(123, 'field')).toBe('field must be a date string')
    })

    test('rejects non-ISO date formats', () => {
      const validator = validators.date()
      expect(validator('123', 'field')).toBe('field must be a valid date')
      expect(validator('10/23/2023', 'field')).toBe('field must be a valid date')
      expect(validator('Oct 23, 2023', 'field')).toBe('field must be a valid date')
    })

    test('rejects empty and whitespace-only strings', () => {
      const validator = validators.date()
      expect(validator('', 'field')).toBe('field must be a valid date')
      expect(validator('   ', 'field')).toBe('field must be a valid date')
    })
  })

  describe('custom', () => {
    test('validates with custom function', () => {
      const validator = validators.custom<string>(
        (val) => val.startsWith('prefix-'),
        '{field} must start with "prefix-"'
      )
      expect(validator('prefix-test', 'field')).toBeNull()
      expect(validator('test', 'field')).toBe('field must start with "prefix-"')
    })

    test('replaces {field} placeholder', () => {
      const validator = validators.custom<number>((val) => val % 2 === 0, '{field} must be even')
      expect(validator(4, 'myNumber')).toBeNull()
      expect(validator(3, 'myNumber')).toBe('myNumber must be even')
    })
  })
})

describe('validate', () => {
  test('validates required fields', () => {
    const schema = {
      name: { required: true, validators: [validators.string()] },
      age: { required: true, validators: [validators.number()] },
    }

    const result1 = validate({}, schema)
    expect(result1.valid).toBe(false)
    expect(result1.errors).toContain('name is required')
    expect(result1.errors).toContain('age is required')

    const result2 = validate({ name: 'John', age: 30 }, schema)
    expect(result2.valid).toBe(true)
    expect(result2.errors).toHaveLength(0)
  })

  test('validates optional fields', () => {
    const schema = {
      name: { required: true, validators: [validators.string()] },
      email: { required: false, validators: [validators.string()] },
    }

    const result1 = validate({ name: 'John' }, schema)
    expect(result1.valid).toBe(true)

    const result2 = validate({ name: 'John', email: 'test@example.com' }, schema)
    expect(result2.valid).toBe(true)

    const result3 = validate({ name: 'John', email: 123 as any }, schema)
    expect(result3.valid).toBe(false)
    expect(result3.errors).toContain('email must be a string')
  })

  test('treats empty strings as missing for required fields', () => {
    const schema = {
      name: { required: true, validators: [validators.string()] },
    }

    const result = validate({ name: '' }, schema)
    expect(result.valid).toBe(false)
    expect(result.errors).toContain('name is required')
  })

  test('validates multiple validators per field', () => {
    const schema = {
      username: {
        required: true,
        validators: [
          validators.string({ minLength: 3, maxLength: 20 }),
          validators.custom<string>((val) => /^[a-z0-9_]+$/.test(val), '{field} can only contain lowercase letters, numbers, and underscores'),
        ],
      },
    }

    const result1 = validate({ username: 'ab' }, schema)
    expect(result1.valid).toBe(false)
    expect(result1.errors).toContain('username must be at least 3 characters')

    const result2 = validate({ username: 'User_Name' }, schema)
    expect(result2.valid).toBe(false)
    expect(result2.errors).toContain('username can only contain lowercase letters, numbers, and underscores')

    const result3 = validate({ username: 'user_name_123' }, schema)
    expect(result3.valid).toBe(true)
  })

  test('collects all errors from multiple fields', () => {
    const schema = {
      name: { required: true, validators: [validators.string({ minLength: 2 })] },
      age: { required: true, validators: [validators.number({ min: 0, max: 120 })] },
      status: { required: true, validators: [validators.enum(['active', 'inactive'])] },
    }

    const result = validate({ name: 'A', age: 150, status: 'pending' } as any, schema)
    expect(result.valid).toBe(false)
    expect(result.errors).toHaveLength(3)
    expect(result.errors).toContain('name must be at least 2 characters')
    expect(result.errors).toContain('age must be at most 120')
    expect(result.errors).toContain('status must be one of: active, inactive')
  })

  test('handles null and undefined values correctly', () => {
    const schema = {
      optional: { required: false, validators: [validators.string()] },
      required: { required: true, validators: [validators.string()] },
    }

    const result1 = validate({ optional: undefined, required: 'value' }, schema)
    expect(result1.valid).toBe(true)

    const result2 = validate({ optional: null, required: 'value' } as any, schema)
    expect(result2.valid).toBe(true)

    const result3 = validate({ optional: 'value', required: null } as any, schema)
    expect(result3.valid).toBe(false)
    expect(result3.errors).toContain('required is required')
  })

  test('skips validators for empty strings on optional fields', () => {
    const schema = {
      email: {
        required: false,
        validators: [
          validators.string({ minLength: 5 }),
          validators.custom<string>((val) => val.includes('@'), '{field} must contain @'),
        ],
      },
    }

    const result = validate({ email: '' }, schema)
    expect(result.valid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  test('runs validators for empty strings on required fields that pass required check', () => {
    const schema = {
      code: {
        required: false,
        validators: [validators.string({ minLength: 3 })],
      },
    }

    // Empty string should skip validators when optional
    const result1 = validate({ code: '' }, schema)
    expect(result1.valid).toBe(true)

    // Non-empty string that fails should still fail
    const result2 = validate({ code: 'ab' }, schema)
    expect(result2.valid).toBe(false)
    expect(result2.errors).toContain('code must be at least 3 characters')
  })
})

describe('createValidator', () => {
  test('creates a reusable validator function', () => {
    interface User {
      username: string
      age: number
      email?: string
    }

    const schema: ObjectSchema<User> = {
      username: { required: true, validators: [validators.string({ minLength: 3 })] },
      age: { required: true, validators: [validators.number({ min: 0 })] },
      email: { required: false, validators: [validators.string()] },
    }

    const validateUser = createValidator(schema)

    const result1 = validateUser({ username: 'ab', age: -1 })
    expect(result1.valid).toBe(false)
    expect(result1.errors).toHaveLength(2)

    const result2 = validateUser({ username: 'john', age: 25 })
    expect(result2.valid).toBe(true)

    const result3 = validateUser({ username: 'jane', age: 30, email: 'jane@example.com' })
    expect(result3.valid).toBe(true)
  })

  test('can be called multiple times with different data', () => {
    const schema = {
      code: { required: true, validators: [validators.string({ pattern: /^[A-Z]{3}$/ })] },
    }

    const validateCode = createValidator(schema)

    expect(validateCode({ code: 'ABC' }).valid).toBe(true)
    expect(validateCode({ code: 'XYZ' }).valid).toBe(true)
    expect(validateCode({ code: 'abc' }).valid).toBe(false)
    expect(validateCode({}).valid).toBe(false)
  })
})
