import { validateSchema, validators } from '../src/lib/validators/schema'
import { itemCreateSchema } from '../src/lib/validators/item-schema'

describe('Schema validators', () => {
  describe('validators.string', () => {
    test('accepts non-empty string', () => {
      expect(validators.string('hello')).toBe(true)
    })

    test('rejects empty string', () => {
      expect(validators.string('')).toBe(false)
    })

    test('rejects whitespace-only string', () => {
      expect(validators.string('   ')).toBe(false)
    })

    test('rejects non-string values', () => {
      expect(validators.string(123)).toBe(false)
      expect(validators.string(null)).toBe(false)
      expect(validators.string(undefined)).toBe(false)
    })
  })

  describe('validators.stringOptional', () => {
    test('accepts non-empty string', () => {
      expect(validators.stringOptional('hello')).toBe(true)
    })

    test('accepts undefined', () => {
      expect(validators.stringOptional(undefined)).toBe(true)
    })

    test('rejects empty string', () => {
      expect(validators.stringOptional('')).toBe(false)
    })

    test('rejects whitespace-only string', () => {
      expect(validators.stringOptional('   ')).toBe(false)
    })

    test('rejects non-string values', () => {
      expect(validators.stringOptional(123)).toBe(false)
      expect(validators.stringOptional(null)).toBe(false)
    })
  })

  describe('validators.enum', () => {
    const statusValidator = validators.enum(['active', 'pending', 'completed'])

    test('accepts value in allowed list', () => {
      expect(statusValidator('active')).toBe(true)
      expect(statusValidator('pending')).toBe(true)
      expect(statusValidator('completed')).toBe(true)
    })

    test('rejects value not in allowed list', () => {
      expect(statusValidator('inactive')).toBe(false)
      expect(statusValidator('draft')).toBe(false)
    })

    test('rejects non-string values', () => {
      expect(statusValidator(123)).toBe(false)
      expect(statusValidator(null)).toBe(false)
      expect(statusValidator(undefined)).toBe(false)
    })
  })

  describe('validators.enumOptional', () => {
    const statusValidator = validators.enumOptional(['active', 'pending', 'completed'])

    test('accepts value in allowed list', () => {
      expect(statusValidator('active')).toBe(true)
    })

    test('accepts undefined', () => {
      expect(statusValidator(undefined)).toBe(true)
    })

    test('rejects value not in allowed list', () => {
      expect(statusValidator('inactive')).toBe(false)
    })

    test('rejects non-string values', () => {
      expect(statusValidator(123)).toBe(false)
      expect(statusValidator(null)).toBe(false)
    })
  })
})

describe('validateSchema', () => {
  test('validates object against schema', () => {
    const schema = {
      name: validators.string,
      email: validators.string,
    }
    const result = validateSchema({ name: 'John', email: 'john@example.com' }, schema)
    expect(result.valid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  test('returns errors for failed validation', () => {
    const schema = {
      name: validators.string,
      email: validators.string,
    }
    const result = validateSchema({ name: '', email: 'john@example.com' }, schema)
    expect(result.valid).toBe(false)
    expect(result.errors).toHaveLength(1)
    expect(result.errors[0].field).toBe('name')
  })

  test('validates multiple fields', () => {
    const schema = {
      name: validators.string,
      email: validators.string,
    }
    const result = validateSchema({ name: '', email: '' }, schema)
    expect(result.valid).toBe(false)
    expect(result.errors).toHaveLength(2)
  })

  test('rejects non-object input', () => {
    const schema = { name: validators.string }
    const result = validateSchema('invalid', schema)
    expect(result.valid).toBe(false)
    expect(result.errors[0].field).toBe('root')
  })

  test('rejects null input', () => {
    const schema = { name: validators.string }
    const result = validateSchema(null, schema)
    expect(result.valid).toBe(false)
    expect(result.errors[0].field).toBe('root')
  })

  test('handles optional fields correctly', () => {
    const schema = {
      name: validators.string,
      description: validators.stringOptional,
    }
    const result = validateSchema({ name: 'Test' }, schema)
    expect(result.valid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })
})

describe('itemCreateSchema', () => {
  test('validates valid item creation', () => {
    const result = validateSchema(
      {
        name: 'Test Item',
        description: 'A test item',
        status: 'active',
      },
      itemCreateSchema,
    )
    expect(result.valid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  test('validates item with required fields only', () => {
    const result = validateSchema({ name: 'Test Item' }, itemCreateSchema)
    expect(result.valid).toBe(true)
  })

  test('rejects item without name', () => {
    const result = validateSchema(
      {
        description: 'A test item',
        status: 'active',
      },
      itemCreateSchema,
    )
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.field === 'name')).toBe(true)
  })

  test('rejects item with empty name', () => {
    const result = validateSchema(
      {
        name: '   ',
        status: 'active',
      },
      itemCreateSchema,
    )
    expect(result.valid).toBe(false)
  })

  test('rejects item with invalid status', () => {
    const result = validateSchema(
      {
        name: 'Test Item',
        status: 'invalid',
      },
      itemCreateSchema,
    )
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.field === 'status')).toBe(true)
  })

  test('accepts item with undefined optional fields', () => {
    const result = validateSchema(
      {
        name: 'Test Item',
        description: undefined,
        status: undefined,
      },
      itemCreateSchema,
    )
    expect(result.valid).toBe(true)
  })
})
