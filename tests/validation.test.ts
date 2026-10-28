import {
  MAX_DESCRIPTION_LENGTH,
  MAX_NAME_LENGTH,
  isValidStatus,
  validateDescription,
  validateItem,
  validateName,
  validateStatus,
} from '../src/services/validation'

describe('isValidStatus', () => {
  test('accepts known statuses including urgent', () => {
    expect(isValidStatus('active')).toBe(true)
    expect(isValidStatus('urgent')).toBe(true)
  })

  test('rejects unknown or non-string statuses', () => {
    expect(isValidStatus('archived')).toBe(false)
    expect(isValidStatus(42)).toBe(false)
    expect(isValidStatus(undefined)).toBe(false)
  })
})

describe('validateName', () => {
  test('requires a non-empty name', () => {
    expect(validateName('')).toContain('Name is required')
    expect(validateName('   ')).toContain('Name is required')
    expect(validateName(undefined)).toContain('Name is required')
    expect(validateName(123)).toContain('Name is required')
  })

  test('accepts a reasonable name', () => {
    expect(validateName('Widget A')).toEqual([])
  })

  test('rejects an over-long name', () => {
    const errors = validateName('x'.repeat(MAX_NAME_LENGTH + 1))
    expect(errors).toHaveLength(1)
    expect(errors[0]).toMatch(/characters or fewer/)
  })
})

describe('validateStatus', () => {
  test('treats missing/empty status as valid', () => {
    expect(validateStatus(undefined)).toEqual([])
    expect(validateStatus(null)).toEqual([])
    expect(validateStatus('')).toEqual([])
  })

  test('accepts valid statuses', () => {
    expect(validateStatus('active')).toEqual([])
    expect(validateStatus('urgent')).toEqual([])
  })

  test('rejects invalid statuses', () => {
    expect(validateStatus('bogus')).toContain('Invalid status')
    expect(validateStatus(7)).toContain('Invalid status')
  })
})

describe('validateDescription', () => {
  test('treats missing description as valid', () => {
    expect(validateDescription(undefined)).toEqual([])
    expect(validateDescription(null)).toEqual([])
  })

  test('rejects non-string descriptions', () => {
    expect(validateDescription(123)).toContain('Description must be a string')
  })

  test('rejects over-long descriptions', () => {
    const errors = validateDescription('x'.repeat(MAX_DESCRIPTION_LENGTH + 1))
    expect(errors).toHaveLength(1)
    expect(errors[0]).toMatch(/characters or fewer/)
  })
})

describe('validateItem', () => {
  test('rejects null/undefined input as a missing name', () => {
    expect(validateItem(null).valid).toBe(false)
    expect(validateItem(undefined).errors).toContain('Name is required')
  })

  test('accepts a valid urgent record (regression)', () => {
    // `urgent` drives priority scoring; it must also pass validation.
    expect(validateItem({ name: 'Test', status: 'urgent' })).toEqual({
      valid: true,
      errors: [],
    })
  })

  test('aggregates multiple errors', () => {
    const result = validateItem({ name: '', status: 'bogus' })
    expect(result.valid).toBe(false)
    expect(result.errors).toEqual(
      expect.arrayContaining(['Name is required', 'Invalid status']),
    )
  })
})
