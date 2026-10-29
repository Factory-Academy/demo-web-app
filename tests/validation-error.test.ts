import {
  ValidationErrorBuilder,
  validationSuccess,
  validationFailure,
  ValidationError,
} from '../src/utils/validation-error'

describe('ValidationErrorBuilder', () => {
  test('builds successful result with no errors', () => {
    const builder = new ValidationErrorBuilder()
    const result = builder.build()

    expect(result.success).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  test('builds failed result with single error', () => {
    const builder = new ValidationErrorBuilder()
    builder.addError('Something went wrong', 'ERROR_CODE')
    const result = builder.build()

    expect(result.success).toBe(false)
    expect(result.errors).toHaveLength(1)
    expect(result.errors[0]).toMatchObject({
      message: 'Something went wrong',
      code: 'ERROR_CODE',
    })
  })

  test('builds failed result with field error', () => {
    const builder = new ValidationErrorBuilder()
    builder.addFieldError('email', 'Invalid email format', 'INVALID_EMAIL')
    const result = builder.build()

    expect(result.success).toBe(false)
    expect(result.errors[0]).toMatchObject({
      field: 'email',
      message: 'Invalid email format',
      code: 'INVALID_EMAIL',
    })
  })

  test('accumulates multiple errors', () => {
    const builder = new ValidationErrorBuilder()
    builder
      .addFieldError('name', 'Name is required', 'MISSING_NAME')
      .addFieldError('age', 'Age must be positive', 'INVALID_AGE')
      .addError('General error', 'GENERAL')

    const result = builder.build()

    expect(result.success).toBe(false)
    expect(result.errors).toHaveLength(3)
  })

  test('hasErrors returns false when no errors', () => {
    const builder = new ValidationErrorBuilder()
    expect(builder.hasErrors()).toBe(false)
  })

  test('hasErrors returns true when errors exist', () => {
    const builder = new ValidationErrorBuilder()
    builder.addError('Error', 'CODE')
    expect(builder.hasErrors()).toBe(true)
  })

  test('builds result with data', () => {
    const builder = new ValidationErrorBuilder()
    const result = builder.build({ value: 42 })

    expect(result.success).toBe(true)
    expect(result.data).toEqual({ value: 42 })
  })
})

describe('validationSuccess', () => {
  test('creates successful result without data', () => {
    const result = validationSuccess()

    expect(result.success).toBe(true)
    expect(result.errors).toHaveLength(0)
    expect(result.data).toBeUndefined()
  })

  test('creates successful result with data', () => {
    const result = validationSuccess('test-value')

    expect(result.success).toBe(true)
    expect(result.data).toBe('test-value')
  })
})

describe('validationFailure', () => {
  test('creates failed result with errors', () => {
    const errors: ValidationError[] = [
      { message: 'Error 1', code: 'ERR1' },
      { field: 'field1', message: 'Error 2', code: 'ERR2' },
    ]
    const result = validationFailure(errors)

    expect(result.success).toBe(false)
    expect(result.errors).toEqual(errors)
  })
})
