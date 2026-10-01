import { createValidationResult } from '../src/utils/validation-utils'

describe('validation-utils', () => {
  describe('createValidationResult', () => {
    test('returns valid result when errors array is empty', () => {
      const result = createValidationResult([])
      expect(result.valid).toBe(true)
      expect(result.errors).toEqual([])
    })

    test('returns invalid result with single error', () => {
      const result = createValidationResult(['Name is required'])
      expect(result.valid).toBe(false)
      expect(result.errors).toEqual(['Name is required'])
    })

    test('returns invalid result with multiple errors', () => {
      const errors = ['Name is required', 'Invalid status', 'Priority out of range']
      const result = createValidationResult(errors)
      expect(result.valid).toBe(false)
      expect(result.errors).toEqual(errors)
    })

    test('preserves error message order', () => {
      const errors = ['Error 1', 'Error 2', 'Error 3']
      const result = createValidationResult(errors)
      expect(result.errors).toEqual(errors)
    })
  })
})
