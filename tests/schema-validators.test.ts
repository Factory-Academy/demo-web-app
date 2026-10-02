import {
  validators,
  field,
  schema,
  validate,
  SchemaValidationResult,
} from '../src/utils/schema-validators'

describe('schema-validators', () => {
  describe('validators.required', () => {
    const requiredValidator = validators.required()

    test('returns error for null value', () => {
      const error = requiredValidator(null, 'username')
      expect(error).toBe('username is required')
    })

    test('returns error for undefined value', () => {
      const error = requiredValidator(undefined, 'email')
      expect(error).toBe('email is required')
    })

    test('returns error for empty string', () => {
      const error = requiredValidator('', 'password')
      expect(error).toBe('password is required')
    })

    test('returns null for valid string', () => {
      const error = requiredValidator('value', 'field')
      expect(error).toBeNull()
    })

    test('returns null for zero', () => {
      const error = requiredValidator(0, 'count')
      expect(error).toBeNull()
    })
  })

  describe('validators.string', () => {
    const stringValidator = validators.string()

    test('returns error for number', () => {
      const error = stringValidator(42, 'name')
      expect(error).toBe('name must be a string')
    })

    test('returns error for object', () => {
      const error = stringValidator({}, 'data')
      expect(error).toBe('data must be a string')
    })

    test('returns null for valid string', () => {
      const error = stringValidator('hello', 'message')
      expect(error).toBeNull()
    })

    test('returns null for empty string', () => {
      const error = stringValidator('', 'field')
      expect(error).toBeNull()
    })
  })

  describe('validators.minLength', () => {
    const minLengthValidator = validators.minLength(3)

    test('returns error for string shorter than minimum', () => {
      const error = minLengthValidator('ab', 'code')
      expect(error).toBe('code must be at least 3 characters')
    })

    test('returns null for string equal to minimum', () => {
      const error = minLengthValidator('abc', 'code')
      expect(error).toBeNull()
    })

    test('returns null for string longer than minimum', () => {
      const error = minLengthValidator('abcd', 'code')
      expect(error).toBeNull()
    })

    test('returns null for non-string values', () => {
      const error = minLengthValidator(42, 'field')
      expect(error).toBeNull()
    })
  })

  describe('validators.maxLength', () => {
    const maxLengthValidator = validators.maxLength(5)

    test('returns error for string longer than maximum', () => {
      const error = maxLengthValidator('abcdef', 'tag')
      expect(error).toBe('tag must be at most 5 characters')
    })

    test('returns null for string equal to maximum', () => {
      const error = maxLengthValidator('abcde', 'tag')
      expect(error).toBeNull()
    })

    test('returns null for string shorter than maximum', () => {
      const error = maxLengthValidator('abc', 'tag')
      expect(error).toBeNull()
    })
  })

  describe('validators.enum', () => {
    const statusValidator = validators.enum(['active', 'pending', 'completed'])

    test('returns error for value not in enum', () => {
      const error = statusValidator('invalid', 'status')
      expect(error).toBe('status must be one of: active, pending, completed')
    })

    test('returns null for valid enum value', () => {
      const error = statusValidator('active', 'status')
      expect(error).toBeNull()
    })

    test('works with numeric enums', () => {
      const numberEnumValidator = validators.enum([1, 2, 3])
      expect(numberEnumValidator(2, 'priority')).toBeNull()
      expect(numberEnumValidator(5, 'priority')).toBe('priority must be one of: 1, 2, 3')
    })
  })

  describe('validators.pattern', () => {
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    const emailValidator = validators.pattern(emailPattern, 'Invalid email format')

    test('returns error for string not matching pattern', () => {
      const error = emailValidator('notanemail', 'email')
      expect(error).toBe('Invalid email format')
    })

    test('returns null for string matching pattern', () => {
      const error = emailValidator('test@example.com', 'email')
      expect(error).toBeNull()
    })

    test('uses default message when custom message not provided', () => {
      const simpleValidator = validators.pattern(/^\d+$/)
      const error = simpleValidator('abc', 'code')
      expect(error).toBe('code format is invalid')
    })
  })

  describe('validators.number', () => {
    const numberValidator = validators.number()

    test('returns error for string', () => {
      const error = numberValidator('42', 'age')
      expect(error).toBe('age must be a number')
    })

    test('returns error for NaN', () => {
      const error = numberValidator(NaN, 'value')
      expect(error).toBe('value must be a number')
    })

    test('returns null for valid number', () => {
      const error = numberValidator(42, 'age')
      expect(error).toBeNull()
    })

    test('returns null for zero', () => {
      const error = numberValidator(0, 'count')
      expect(error).toBeNull()
    })

    test('returns null for negative number', () => {
      const error = numberValidator(-5, 'balance')
      expect(error).toBeNull()
    })
  })

  describe('validators.min', () => {
    const minValidator = validators.min(18)

    test('returns error for number below minimum', () => {
      const error = minValidator(17, 'age')
      expect(error).toBe('age must be at least 18')
    })

    test('returns null for number equal to minimum', () => {
      const error = minValidator(18, 'age')
      expect(error).toBeNull()
    })

    test('returns null for number above minimum', () => {
      const error = minValidator(25, 'age')
      expect(error).toBeNull()
    })
  })

  describe('validators.max', () => {
    const maxValidator = validators.max(100)

    test('returns error for number above maximum', () => {
      const error = maxValidator(101, 'score')
      expect(error).toBe('score must be at most 100')
    })

    test('returns null for number equal to maximum', () => {
      const error = maxValidator(100, 'score')
      expect(error).toBeNull()
    })

    test('returns null for number below maximum', () => {
      const error = maxValidator(75, 'score')
      expect(error).toBeNull()
    })
  })

  describe('validate', () => {
    test('validates simple required string field', () => {
      const testSchema = schema({
        name: field([validators.required(), validators.string()]),
      })

      const result = validate({ name: 'John' }, testSchema)
      expect(result.valid).toBe(true)
      expect(result.errors).toEqual([])
    })

    test('returns error for missing required field', () => {
      const testSchema = schema({
        name: field([validators.required(), validators.string()]),
      })

      const result = validate({}, testSchema)
      expect(result.valid).toBe(false)
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0].field).toBe('name')
      expect(result.errors[0].message).toBe('name is required')
    })

    test('validates multiple fields', () => {
      const testSchema = schema({
        name: field([validators.required(), validators.string()]),
        age: field([validators.required(), validators.number(), validators.min(0)]),
      })

      const result = validate({ name: 'Jane', age: 30 }, testSchema)
      expect(result.valid).toBe(true)
    })

    test('collects multiple field errors', () => {
      const testSchema = schema({
        name: field([validators.required(), validators.string()]),
        status: field([validators.required(), validators.enum(['active', 'inactive'])]),
      })

      const result = validate({}, testSchema)
      expect(result.valid).toBe(false)
      expect(result.errors).toHaveLength(2)
      expect(result.errors.map((e) => e.field)).toContain('name')
      expect(result.errors.map((e) => e.field)).toContain('status')
    })

    test('stops on first error per field', () => {
      const testSchema = schema({
        name: field([
          validators.required(),
          validators.string(),
          validators.minLength(3),
          validators.maxLength(10),
        ]),
      })

      const result = validate({ name: '' }, testSchema)
      expect(result.valid).toBe(false)
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0].message).toBe('name is required')
    })

    test('handles optional fields when value is undefined', () => {
      const testSchema = schema({
        name: field([validators.required(), validators.string()]),
        description: field([validators.string(), validators.maxLength(100)], { optional: true }),
      })

      const result = validate({ name: 'Test' }, testSchema)
      expect(result.valid).toBe(true)
      expect(result.errors).toEqual([])
    })

    test('validates optional field when value is provided', () => {
      const testSchema = schema({
        name: field([validators.required(), validators.string()]),
        description: field([validators.string(), validators.maxLength(10)], { optional: true }),
      })

      const result = validate({ name: 'Test', description: 'This is too long' }, testSchema)
      expect(result.valid).toBe(false)
      expect(result.errors[0].field).toBe('description')
      expect(result.errors[0].message).toBe('description must be at most 10 characters')
    })

    test('validates complex item schema', () => {
      const itemSchema = schema({
        name: field([validators.required(), validators.string(), validators.minLength(1)]),
        description: field([validators.string(), validators.maxLength(500)], { optional: true }),
        status: field(
          [validators.required(), validators.string(), validators.enum(['active', 'pending', 'completed'])],
          { optional: true }
        ),
      })

      const validItem = {
        name: 'Test Item',
        description: 'A test item',
        status: 'active',
      }

      const result = validate(validItem, itemSchema)
      expect(result.valid).toBe(true)

      const invalidItem = {
        name: '',
        status: 'invalid',
      }

      const result2 = validate(invalidItem, itemSchema)
      expect(result2.valid).toBe(false)
      expect(result2.errors.length).toBeGreaterThan(0)
    })
  })
})
