import {
  validate,
  compose,
  required,
  minLength,
  maxLength,
  oneOf,
  isString,
  isNumber,
} from '../src/lib/validators'

describe('validators', () => {
  describe('required', () => {
    it('should reject null values', () => {
      const error = required(null, 'field')
      expect(error).not.toBeNull()
      expect(error?.message).toBe('field is required')
    })

    it('should reject undefined values', () => {
      const error = required(undefined, 'field')
      expect(error).not.toBeNull()
      expect(error?.message).toBe('field is required')
    })

    it('should reject empty strings', () => {
      const error = required('', 'field')
      expect(error).not.toBeNull()
      expect(error?.message).toBe('field is required')
    })

    it('should accept valid values', () => {
      expect(required('value', 'field')).toBeNull()
      expect(required(0, 'field')).toBeNull()
      expect(required(false, 'field')).toBeNull()
    })
  })

  describe('minLength', () => {
    it('should reject strings shorter than minimum', () => {
      const validator = minLength(5)
      const error = validator('abc', 'field')
      expect(error).not.toBeNull()
      expect(error?.message).toBe('field must be at least 5 characters')
    })

    it('should accept strings meeting minimum length', () => {
      const validator = minLength(5)
      expect(validator('hello', 'field')).toBeNull()
      expect(validator('hello world', 'field')).toBeNull()
    })

    it('should trim whitespace when checking length', () => {
      const validator = minLength(3)
      const error = validator('  ', 'field')
      expect(error).not.toBeNull()
    })
  })

  describe('maxLength', () => {
    it('should reject strings longer than maximum', () => {
      const validator = maxLength(5)
      const error = validator('toolong', 'field')
      expect(error).not.toBeNull()
      expect(error?.message).toBe('field must not exceed 5 characters')
    })

    it('should accept strings within maximum length', () => {
      const validator = maxLength(5)
      expect(validator('abc', 'field')).toBeNull()
      expect(validator('hello', 'field')).toBeNull()
    })
  })

  describe('oneOf', () => {
    it('should reject values not in allowed list', () => {
      const validator = oneOf(['red', 'green', 'blue'])
      const error = validator('yellow', 'color')
      expect(error).not.toBeNull()
      expect(error?.message).toBe('color must be one of: red, green, blue')
    })

    it('should accept values in allowed list', () => {
      const validator = oneOf(['red', 'green', 'blue'])
      expect(validator('red', 'color')).toBeNull()
      expect(validator('green', 'color')).toBeNull()
      expect(validator('blue', 'color')).toBeNull()
    })
  })

  describe('isString', () => {
    it('should reject non-string values', () => {
      expect(isString(123, 'field')).not.toBeNull()
      expect(isString(true, 'field')).not.toBeNull()
      expect(isString({}, 'field')).not.toBeNull()
      expect(isString([], 'field')).not.toBeNull()
    })

    it('should accept string values', () => {
      expect(isString('hello', 'field')).toBeNull()
      expect(isString('', 'field')).toBeNull()
    })
  })

  describe('isNumber', () => {
    it('should reject non-number values', () => {
      expect(isNumber('123', 'field')).not.toBeNull()
      expect(isNumber(true, 'field')).not.toBeNull()
      expect(isNumber({}, 'field')).not.toBeNull()
      expect(isNumber(NaN, 'field')).not.toBeNull()
    })

    it('should accept number values', () => {
      expect(isNumber(0, 'field')).toBeNull()
      expect(isNumber(123, 'field')).toBeNull()
      expect(isNumber(-456, 'field')).toBeNull()
      expect(isNumber(3.14, 'field')).toBeNull()
    })
  })

  describe('compose', () => {
    it('should run multiple validators in sequence', () => {
      const validator = compose(isString, minLength(3), maxLength(10))
      expect(validator('hello', 'field')).toBeNull()
    })

    it('should return first error encountered', () => {
      const validator = compose(isString, minLength(5))
      const error = validator('abc', 'field')
      expect(error).not.toBeNull()
      expect(error?.message).toBe('field must be at least 5 characters')
    })

    it('should stop at first failing validator', () => {
      const validator = compose(isString, minLength(5))
      const error = validator(123, 'field')
      expect(error).not.toBeNull()
      expect(error?.message).toBe('field must be a string')
    })
  })

  describe('validate', () => {
    it('should validate required fields', () => {
      const schema = {
        name: { required: true },
        email: { required: true },
      }
      const result = validate({ name: 'John' }, schema)
      expect(result.valid).toBe(false)
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0].field).toBe('email')
    })

    it('should skip validation for optional missing fields', () => {
      const schema = {
        name: { required: true, validator: isString },
        description: { required: false, validator: isString },
      }
      const result = validate({ name: 'John' }, schema)
      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should validate optional fields when provided', () => {
      const schema = {
        name: { required: true, validator: isString },
        age: { required: false, validator: isNumber },
      }
      const result = validate({ name: 'John', age: 'thirty' }, schema)
      expect(result.valid).toBe(false)
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0].field).toBe('age')
    })

    it('should validate complex schemas', () => {
      const schema = {
        username: {
          required: true,
          validator: compose(isString, minLength(3), maxLength(20)),
        },
        role: {
          required: false,
          validator: oneOf(['admin', 'user', 'guest']),
        },
      }

      const validData = { username: 'john_doe', role: 'user' }
      expect(validate(validData, schema).valid).toBe(true)

      const invalidData = { username: 'ab', role: 'superuser' }
      const result = validate(invalidData, schema)
      expect(result.valid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
    })

    it('should return all validation errors', () => {
      const schema = {
        name: { required: true, validator: isString },
        email: { required: true, validator: isString },
        age: { required: true, validator: isNumber },
      }
      const result = validate({}, schema)
      expect(result.valid).toBe(false)
      expect(result.errors).toHaveLength(3)
    })

    it('should return empty errors for valid data', () => {
      const schema = {
        name: { required: true, validator: isString },
        age: { required: false, validator: isNumber },
      }
      const result = validate({ name: 'John', age: 30 }, schema)
      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })
  })
})
