import {
  ValidationError,
  requirePresent,
  requireNonEmpty,
} from '../src/lib/validation-error'

describe('ValidationError', () => {
  test('creates error with single message', () => {
    const error = new ValidationError(['Name is required'])
    expect(error).toBeInstanceOf(Error)
    expect(error).toBeInstanceOf(ValidationError)
    expect(error.name).toBe('ValidationError')
    expect(error.errors).toEqual(['Name is required'])
    expect(error.message).toBe('Validation failed: Name is required')
  })

  test('creates error with multiple messages', () => {
    const error = new ValidationError(['Name is required', 'Status is invalid'])
    expect(error.errors).toEqual(['Name is required', 'Status is invalid'])
    expect(error.message).toBe('Validation failed: Name is required, Status is invalid')
  })

  test('throw method creates and throws error', () => {
    expect(() => ValidationError.throw('Test error')).toThrow(ValidationError)
    try {
      ValidationError.throw('Test error')
    } catch (error) {
      expect(error).toBeInstanceOf(ValidationError)
      const validationError = error as ValidationError
      expect(validationError.errors).toEqual(['Test error'])
    }
  })

  test('throwAll method creates and throws error with multiple messages', () => {
    expect(() => ValidationError.throwAll(['Error 1', 'Error 2'])).toThrow(ValidationError)
    try {
      ValidationError.throwAll(['Error 1', 'Error 2'])
    } catch (error) {
      expect(error).toBeInstanceOf(ValidationError)
      const validationError = error as ValidationError
      expect(validationError.errors).toEqual(['Error 1', 'Error 2'])
    }
  })
})

describe('requirePresent', () => {
  test('does not throw for non-null values', () => {
    expect(() => requirePresent('value', 'error')).not.toThrow()
    expect(() => requirePresent(0, 'error')).not.toThrow()
    expect(() => requirePresent(false, 'error')).not.toThrow()
    expect(() => requirePresent({}, 'error')).not.toThrow()
  })

  test('throws ValidationError for null', () => {
    expect(() => requirePresent(null, 'Value is required')).toThrow(ValidationError)
    expect(() => requirePresent(null, 'Value is required')).toThrow('Value is required')
  })

  test('throws ValidationError for undefined', () => {
    expect(() => requirePresent(undefined, 'Value is required')).toThrow(ValidationError)
    expect(() => requirePresent(undefined, 'Value is required')).toThrow('Value is required')
  })
})

describe('requireNonEmpty', () => {
  test('does not throw for non-empty strings', () => {
    expect(() => requireNonEmpty('value', 'error')).not.toThrow()
    expect(() => requireNonEmpty('  value  ', 'error')).not.toThrow()
  })

  test('throws ValidationError for empty string', () => {
    expect(() => requireNonEmpty('', 'String is required')).toThrow(ValidationError)
    expect(() => requireNonEmpty('', 'String is required')).toThrow('String is required')
  })

  test('throws ValidationError for whitespace-only string', () => {
    expect(() => requireNonEmpty('   ', 'String is required')).toThrow(ValidationError)
    expect(() => requireNonEmpty('   ', 'String is required')).toThrow('String is required')
  })

  test('throws ValidationError for null', () => {
    expect(() => requireNonEmpty(null, 'String is required')).toThrow(ValidationError)
  })

  test('throws ValidationError for undefined', () => {
    expect(() => requireNonEmpty(undefined, 'String is required')).toThrow(ValidationError)
  })
})
