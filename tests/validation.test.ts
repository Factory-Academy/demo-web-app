import {
  validateRequiredField,
  validateEnumField,
  collectValidationErrors,
} from '../src/utils/validation'

describe('validation utils', () => {
  describe('validateRequiredField', () => {
    test('returns error for undefined value', () => {
      const result = validateRequiredField(undefined, 'Test Field')
      expect(result).toBe('Test Field is required')
    })

    test('returns error for empty string', () => {
      const result = validateRequiredField('', 'Test Field')
      expect(result).toBe('Test Field is required')
    })

    test('returns error for whitespace-only string', () => {
      const result = validateRequiredField('   ', 'Test Field')
      expect(result).toBe('Test Field is required')
    })

    test('returns null for valid non-empty string', () => {
      const result = validateRequiredField('valid value', 'Test Field')
      expect(result).toBeNull()
    })

    test('trims whitespace before validation', () => {
      const result = validateRequiredField('  valid  ', 'Test Field')
      expect(result).toBeNull()
    })

    test('uses field name in error message', () => {
      const result = validateRequiredField('', 'Custom Name')
      expect(result).toBe('Custom Name is required')
    })
  })

  describe('validateEnumField', () => {
    const allowedValues = ['active', 'pending', 'completed']

    test('returns null for undefined value', () => {
      const result = validateEnumField(undefined, allowedValues, 'status')
      expect(result).toBeNull()
    })

    test('returns null for empty string', () => {
      const result = validateEnumField('', allowedValues, 'status')
      expect(result).toBeNull()
    })

    test('returns null for valid enum value', () => {
      const result = validateEnumField('active', allowedValues, 'status')
      expect(result).toBeNull()
    })

    test('returns error for invalid enum value', () => {
      const result = validateEnumField('invalid', allowedValues, 'status')
      expect(result).toBe('Invalid status')
    })

    test('uses field name in error message', () => {
      const result = validateEnumField('bad', allowedValues, 'priority')
      expect(result).toBe('Invalid priority')
    })

    test('handles whitespace-only values', () => {
      const result = validateEnumField('   ', allowedValues, 'status')
      expect(result).toBeNull()
    })
  })

  describe('collectValidationErrors', () => {
    test('filters out null values', () => {
      const results = [null, 'Error 1', null, 'Error 2', null]
      const collected = collectValidationErrors(results)
      expect(collected).toEqual(['Error 1', 'Error 2'])
    })

    test('returns empty array for all null values', () => {
      const results = [null, null, null]
      const collected = collectValidationErrors(results)
      expect(collected).toEqual([])
    })

    test('returns all errors when no nulls', () => {
      const results = ['Error 1', 'Error 2', 'Error 3']
      const collected = collectValidationErrors(results)
      expect(collected).toEqual(['Error 1', 'Error 2', 'Error 3'])
    })

    test('preserves error message order', () => {
      const results = ['First', null, 'Second', 'Third', null]
      const collected = collectValidationErrors(results)
      expect(collected).toEqual(['First', 'Second', 'Third'])
    })
  })
})
