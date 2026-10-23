import {
  ValidationError,
  isValidationError,
  validationResultToError,
} from '../src/utils/errors'

describe('ValidationError', () => {
  test('constructs with multiple errors', () => {
    const errors = ['Error one', 'Error two']
    const error = new ValidationError(errors)
    expect(error).toBeInstanceOf(Error)
    expect(error).toBeInstanceOf(ValidationError)
    expect(error.errors).toEqual(errors)
    expect(error.message).toContain('Error one')
    expect(error.message).toContain('Error two')
    expect(error.name).toBe('ValidationError')
  })

  test('constructs with custom message', () => {
    const error = new ValidationError(['Field error'], 'Custom message')
    expect(error.message).toBe('Custom message')
    expect(error.errors).toEqual(['Field error'])
  })

  test('single creates error with one message', () => {
    const error = ValidationError.single('Single error')
    expect(error).toBeInstanceOf(ValidationError)
    expect(error.errors).toEqual(['Single error'])
    expect(error.message).toContain('Single error')
  })

  test('hasError checks for specific error message', () => {
    const error = new ValidationError(['Name is required', 'Status invalid'])
    expect(ValidationError.hasError(error, 'Name')).toBe(true)
    expect(ValidationError.hasError(error, 'Status')).toBe(true)
    expect(ValidationError.hasError(error, 'Missing')).toBe(false)
  })

  test('hasError returns false for non-ValidationError', () => {
    const error = new Error('Generic error')
    expect(ValidationError.hasError(error, 'Name')).toBe(false)
  })

  test('instanceof works correctly after ES5 compilation', () => {
    const error = new ValidationError(['Test'])
    expect(error instanceof Error).toBe(true)
    expect(error instanceof ValidationError).toBe(true)
  })
})

describe('isValidationError', () => {
  test('returns true for ValidationError instances', () => {
    const error = new ValidationError(['Test'])
    expect(isValidationError(error)).toBe(true)
  })

  test('returns false for other error types', () => {
    expect(isValidationError(new Error('Generic'))).toBe(false)
    expect(isValidationError(new TypeError('Type error'))).toBe(false)
    expect(isValidationError('not an error')).toBe(false)
    expect(isValidationError(null)).toBe(false)
    expect(isValidationError(undefined)).toBe(false)
  })

  test('narrows type correctly', () => {
    const error: unknown = new ValidationError(['Test error'])
    if (isValidationError(error)) {
      // TypeScript should know error.errors exists
      expect(error.errors).toEqual(['Test error'])
    }
  })
})

describe('validationResultToError', () => {
  test('returns null for valid result', () => {
    const result = { valid: true, errors: [] }
    expect(validationResultToError(result)).toBeNull()
  })

  test('returns ValidationError for invalid result', () => {
    const result = { valid: false, errors: ['Error one', 'Error two'] }
    const error = validationResultToError(result)
    expect(error).toBeInstanceOf(ValidationError)
    expect(error?.errors).toEqual(['Error one', 'Error two'])
  })

  test('handles empty errors array', () => {
    const result = { valid: false, errors: [] }
    const error = validationResultToError(result)
    expect(error).toBeInstanceOf(ValidationError)
    expect(error?.errors).toEqual([])
  })
})
