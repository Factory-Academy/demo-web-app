import {
  ALLOWED_STATUSES,
  ValidationRule,
  requireName,
  validStatus,
  validateItem,
} from '@/lib/item-rules/validation'

describe('requireName', () => {
  test('rejects missing, empty, and whitespace-only names', () => {
    expect(requireName({})).toBe('Name is required')
    expect(requireName({ name: '' })).toBe('Name is required')
    expect(requireName({ name: '   ' })).toBe('Name is required')
  })

  test('accepts a non-blank name', () => {
    expect(requireName({ name: 'Widget' })).toBeNull()
    expect(requireName({ name: '  padded  ' })).toBeNull()
  })
})

describe('validStatus', () => {
  test('accepts every allowed status', () => {
    for (const status of ALLOWED_STATUSES) {
      expect(validStatus({ status })).toBeNull()
    }
  })

  test('treats an absent or empty status as acceptable', () => {
    expect(validStatus({})).toBeNull()
    expect(validStatus({ status: '' })).toBeNull()
  })

  test('rejects an unknown status', () => {
    expect(validStatus({ status: 'urgent' })).toBe('Invalid status')
    expect(validStatus({ status: 'archived' })).toBe('Invalid status')
  })
})

describe('validateItem', () => {
  test('accepts a well-formed item', () => {
    expect(validateItem({ name: 'Test', status: 'active' })).toEqual({
      valid: true,
      errors: [],
    })
  })

  test('rejects an empty name', () => {
    const result = validateItem({ name: '' })
    expect(result.valid).toBe(false)
    expect(result.errors).toContain('Name is required')
  })

  test('collects multiple failures in rule order', () => {
    const result = validateItem({ name: '', status: 'bogus' })
    expect(result.valid).toBe(false)
    expect(result.errors).toEqual(['Name is required', 'Invalid status'])
  })

  test('a name alone is valid when no status is supplied', () => {
    expect(validateItem({ name: 'Just a name' }).valid).toBe(true)
  })

  test('honors a custom rule set', () => {
    const forbidTest: ValidationRule = (data) =>
      data.name === 'Test' ? 'Name may not be "Test"' : null
    const result = validateItem({ name: 'Test' }, [forbidTest])
    expect(result.valid).toBe(false)
    expect(result.errors).toEqual(['Name may not be "Test"'])
  })
})
