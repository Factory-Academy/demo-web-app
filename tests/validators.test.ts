import { validators, validate, validateField, ValidationError, Schema } from '../src/models/validators'
import { ValidatorService } from '../src/services/validator-service'

describe('validators', () => {
  describe('required', () => {
    const validator = validators.required()

    test('fails for null', () => {
      const result = validator(null, 'field')
      expect(result).toEqual({ field: 'field', message: 'field is required' })
    })

    test('fails for undefined', () => {
      const result = validator(undefined, 'field')
      expect(result).toEqual({ field: 'field', message: 'field is required' })
    })

    test('fails for empty string', () => {
      const result = validator('', 'field')
      expect(result).toEqual({ field: 'field', message: 'field is required' })
    })

    test('passes for non-empty string', () => {
      const result = validator('value', 'field')
      expect(result).toBeNull()
    })

    test('passes for number zero', () => {
      const result = validator(0, 'field')
      expect(result).toBeNull()
    })

    test('passes for boolean false', () => {
      const result = validator(false, 'field')
      expect(result).toBeNull()
    })
  })

  describe('minLength', () => {
    const validator = validators.minLength(5)

    test('fails for string shorter than minimum', () => {
      const result = validator('abc', 'field')
      expect(result).toEqual({ field: 'field', message: 'field must be at least 5 characters' })
    })

    test('passes for string equal to minimum', () => {
      const result = validator('abcde', 'field')
      expect(result).toBeNull()
    })

    test('passes for string longer than minimum', () => {
      const result = validator('abcdefgh', 'field')
      expect(result).toBeNull()
    })

    test('passes for non-string values', () => {
      const result = validator(123, 'field')
      expect(result).toBeNull()
    })
  })

  describe('maxLength', () => {
    const validator = validators.maxLength(10)

    test('fails for string longer than maximum', () => {
      const result = validator('12345678901', 'field')
      expect(result).toEqual({ field: 'field', message: 'field must not exceed 10 characters' })
    })

    test('passes for string equal to maximum', () => {
      const result = validator('1234567890', 'field')
      expect(result).toBeNull()
    })

    test('passes for string shorter than maximum', () => {
      const result = validator('123', 'field')
      expect(result).toBeNull()
    })
  })

  describe('oneOf', () => {
    const validator = validators.oneOf(['red', 'green', 'blue'])

    test('fails for value not in list', () => {
      const result = validator('yellow', 'color')
      expect(result).toEqual({ 
        field: 'color', 
        message: 'color must be one of: red, green, blue' 
      })
    })

    test('passes for value in list', () => {
      const result = validator('red', 'color')
      expect(result).toBeNull()
    })

    test('works with numbers', () => {
      const numValidator = validators.oneOf([1, 2, 3])
      expect(numValidator(1, 'num')).toBeNull()
      expect(numValidator(5, 'num')).toEqual({ 
        field: 'num', 
        message: 'num must be one of: 1, 2, 3' 
      })
    })
  })

  describe('pattern', () => {
    const validator = validators.pattern(/^[A-Z]{3}$/, 'Must be 3 uppercase letters')

    test('fails for non-matching string', () => {
      const result = validator('abc', 'code')
      expect(result).toEqual({ field: 'code', message: 'Must be 3 uppercase letters' })
    })

    test('passes for matching string', () => {
      const result = validator('ABC', 'code')
      expect(result).toBeNull()
    })

    test('uses default message when not provided', () => {
      const defaultValidator = validators.pattern(/^\d+$/)
      const result = defaultValidator('abc', 'field')
      expect(result).toEqual({ field: 'field', message: 'field has invalid format' })
    })
  })

  describe('email', () => {
    const validator = validators.email()

    test('fails for invalid email', () => {
      const result = validator('notanemail', 'email')
      expect(result).toEqual({ field: 'email', message: 'email must be a valid email address' })
    })

    test('fails for email without domain', () => {
      const result = validator('user@', 'email')
      expect(result).toEqual({ field: 'email', message: 'email must be a valid email address' })
    })

    test('passes for valid email', () => {
      const result = validator('user@example.com', 'email')
      expect(result).toBeNull()
    })

    test('passes for email with subdomain', () => {
      const result = validator('user@mail.example.com', 'email')
      expect(result).toBeNull()
    })
  })

  describe('range', () => {
    const validator = validators.range(1, 10)

    test('fails for value below minimum', () => {
      const result = validator(0, 'score')
      expect(result).toEqual({ field: 'score', message: 'score must be between 1 and 10' })
    })

    test('fails for value above maximum', () => {
      const result = validator(11, 'score')
      expect(result).toEqual({ field: 'score', message: 'score must be between 1 and 10' })
    })

    test('passes for value at minimum', () => {
      const result = validator(1, 'score')
      expect(result).toBeNull()
    })

    test('passes for value at maximum', () => {
      const result = validator(10, 'score')
      expect(result).toBeNull()
    })

    test('passes for value in range', () => {
      const result = validator(5, 'score')
      expect(result).toBeNull()
    })
  })

  describe('type', () => {
    test('validates string type', () => {
      const validator = validators.type('string')
      expect(validator('text', 'field')).toBeNull()
      expect(validator(123, 'field')).toEqual({ 
        field: 'field', 
        message: 'field must be of type string' 
      })
    })

    test('validates number type', () => {
      const validator = validators.type('number')
      expect(validator(123, 'field')).toBeNull()
      expect(validator('123', 'field')).toEqual({ 
        field: 'field', 
        message: 'field must be of type number' 
      })
    })

    test('validates boolean type', () => {
      const validator = validators.type('boolean')
      expect(validator(true, 'field')).toBeNull()
      expect(validator('true', 'field')).toEqual({ 
        field: 'field', 
        message: 'field must be of type boolean' 
      })
    })

    test('validates object type', () => {
      const validator = validators.type('object')
      expect(validator({}, 'field')).toBeNull()
      expect(validator('obj', 'field')).toEqual({ 
        field: 'field', 
        message: 'field must be of type object' 
      })
    })
  })
})

describe('validateField', () => {
  test('returns empty array for valid field', () => {
    const schema = {
      validators: [validators.required(), validators.minLength(3)],
    }
    const errors = validateField('test', 'name', schema)
    expect(errors).toEqual([])
  })

  test('returns all validation errors for invalid field', () => {
    const schema = {
      validators: [validators.required(), validators.minLength(5), validators.maxLength(3)],
    }
    const errors = validateField('ab', 'name', schema)
    expect(errors).toHaveLength(1)
    expect(errors[0]).toEqual({ 
      field: 'name', 
      message: 'name must be at least 5 characters' 
    })
  })

  test('skips validation for optional undefined fields', () => {
    const schema = {
      validators: [validators.required()],
      optional: true,
    }
    const errors = validateField(undefined, 'field', schema)
    expect(errors).toEqual([])
  })

  test('skips validation for optional null fields', () => {
    const schema = {
      validators: [validators.required()],
      optional: true,
    }
    const errors = validateField(null, 'field', schema)
    expect(errors).toEqual([])
  })

  test('validates optional fields when value is provided', () => {
    const schema = {
      validators: [validators.minLength(5)],
      optional: true,
    }
    const errors = validateField('abc', 'field', schema)
    expect(errors).toHaveLength(1)
  })
})

describe('validate', () => {
  test('validates object with all valid fields', () => {
    const schema: Schema = {
      name: { validators: [validators.required(), validators.minLength(3)] },
      age: { validators: [validators.type('number'), validators.range(0, 120)] },
    }
    const result = validate({ name: 'John', age: 30 }, schema)
    expect(result.valid).toBe(true)
    expect(result.errors).toEqual([])
  })

  test('returns all validation errors for invalid object', () => {
    const schema: Schema = {
      name: { validators: [validators.required(), validators.minLength(3)] },
      email: { validators: [validators.required(), validators.email()] },
    }
    const result = validate({ name: 'ab', email: 'invalid' }, schema)
    expect(result.valid).toBe(false)
    expect(result.errors).toHaveLength(2)
    expect(result.errors).toContainEqual({ 
      field: 'name', 
      message: 'name must be at least 3 characters' 
    })
    expect(result.errors).toContainEqual({ 
      field: 'email', 
      message: 'email must be a valid email address' 
    })
  })

  test('handles optional fields correctly', () => {
    const schema: Schema = {
      name: { validators: [validators.required()] },
      description: { validators: [validators.minLength(10)], optional: true },
    }
    const result = validate({ name: 'Test' }, schema)
    expect(result.valid).toBe(true)
    expect(result.errors).toEqual([])
  })

  test('validates provided optional fields', () => {
    const schema: Schema = {
      name: { validators: [validators.required()] },
      description: { validators: [validators.minLength(10)], optional: true },
    }
    const result = validate({ name: 'Test', description: 'short' }, schema)
    expect(result.valid).toBe(false)
    expect(result.errors).toHaveLength(1)
  })
})

describe('ValidatorService', () => {
  const service = new ValidatorService()

  describe('validateItemCreate', () => {
    test('validates valid item data', () => {
      const result = service.validateItemCreate({
        name: 'New Item',
        status: 'active',
      })
      expect(result.valid).toBe(true)
      expect(result.errors).toEqual([])
    })

    test('validates item with optional description', () => {
      const result = service.validateItemCreate({
        name: 'Item with description',
        description: 'This is a test item',
        status: 'pending',
      })
      expect(result.valid).toBe(true)
      expect(result.errors).toEqual([])
    })

    test('validates item without optional status', () => {
      const result = service.validateItemCreate({
        name: 'Item without status',
      })
      expect(result.valid).toBe(true)
      expect(result.errors).toEqual([])
    })

    test('rejects empty name', () => {
      const result = service.validateItemCreate({
        name: '',
        status: 'active',
      })
      expect(result.valid).toBe(false)
      expect(result.errors).toContainEqual({
        field: 'name',
        message: 'name is required',
      })
    })

    test('rejects missing name', () => {
      const result = service.validateItemCreate({
        status: 'active',
      })
      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.field === 'name')).toBe(true)
    })

    test('rejects name exceeding maximum length', () => {
      const longName = 'a'.repeat(101)
      const result = service.validateItemCreate({
        name: longName,
      })
      expect(result.valid).toBe(false)
      expect(result.errors).toContainEqual({
        field: 'name',
        message: 'name must not exceed 100 characters',
      })
    })

    test('rejects description exceeding maximum length', () => {
      const longDescription = 'a'.repeat(501)
      const result = service.validateItemCreate({
        name: 'Valid name',
        description: longDescription,
      })
      expect(result.valid).toBe(false)
      expect(result.errors).toContainEqual({
        field: 'description',
        message: 'description must not exceed 500 characters',
      })
    })

    test('rejects invalid status', () => {
      const result = service.validateItemCreate({
        name: 'Valid name',
        status: 'invalid-status',
      })
      expect(result.valid).toBe(false)
      expect(result.errors).toContainEqual({
        field: 'status',
        message: 'status must be one of: active, pending, completed',
      })
    })

    test('accepts all valid status values', () => {
      const statuses = ['active', 'pending', 'completed']
      for (const status of statuses) {
        const result = service.validateItemCreate({
          name: 'Valid item',
          status,
        })
        expect(result.valid).toBe(true)
      }
    })
  })

  describe('createValidator', () => {
    test('creates custom validator with provided schema', () => {
      const customValidator = service.createValidator({
        email: {
          validators: [validators.required(), validators.email()],
        },
        age: {
          validators: [validators.type('number'), validators.range(18, 100)],
        },
      })

      const result = customValidator({ 
        email: 'test@example.com', 
        age: 25 
      })
      expect(result.valid).toBe(true)
    })

    test('custom validator catches validation errors', () => {
      const customValidator = service.createValidator({
        username: {
          validators: [validators.required(), validators.minLength(3)],
        },
      })

      const result = customValidator({ username: 'ab' })
      expect(result.valid).toBe(false)
      expect(result.errors).toContainEqual({
        field: 'username',
        message: 'username must be at least 3 characters',
      })
    })
  })
})
