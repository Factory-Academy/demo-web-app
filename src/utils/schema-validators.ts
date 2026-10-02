/**
 * Lightweight schema validation module
 * Provides composable validators for input validation
 */

export type ValidatorFn<T = any> = (value: T, fieldName: string) => string | null

export interface SchemaField<T = any> {
  validators: ValidatorFn<T>[]
  optional?: boolean
}

export interface Schema {
  [key: string]: SchemaField
}

export interface ValidationError {
  field: string
  message: string
}

export interface SchemaValidationResult {
  valid: boolean
  errors: ValidationError[]
}

/**
 * Core validator functions
 */
export const validators = {
  /**
   * Validates that a value is not empty
   */
  required: (): ValidatorFn => (value, field) => {
    if (value === null || value === undefined || value === '') {
      return `${field} is required`
    }
    return null
  },

  /**
   * Validates that a value is a string
   */
  string: (): ValidatorFn => (value, field) => {
    if (typeof value !== 'string') {
      return `${field} must be a string`
    }
    return null
  },

  /**
   * Validates minimum string length
   */
  minLength: (min: number): ValidatorFn => (value, field) => {
    if (typeof value === 'string' && value.length < min) {
      return `${field} must be at least ${min} characters`
    }
    return null
  },

  /**
   * Validates maximum string length
   */
  maxLength: (max: number): ValidatorFn => (value, field) => {
    if (typeof value === 'string' && value.length > max) {
      return `${field} must be at most ${max} characters`
    }
    return null
  },

  /**
   * Validates that a value is one of the allowed enum values
   */
  enum: <T>(allowed: T[]): ValidatorFn<T> => (value, field) => {
    if (!allowed.includes(value)) {
      return `${field} must be one of: ${allowed.join(', ')}`
    }
    return null
  },

  /**
   * Validates that a string matches a pattern
   */
  pattern: (regex: RegExp, message?: string): ValidatorFn => (value, field) => {
    if (typeof value === 'string' && !regex.test(value)) {
      return message || `${field} format is invalid`
    }
    return null
  },

  /**
   * Validates that a value is a number
   */
  number: (): ValidatorFn => (value, field) => {
    if (typeof value !== 'number' || isNaN(value)) {
      return `${field} must be a number`
    }
    return null
  },

  /**
   * Validates minimum number value
   */
  min: (min: number): ValidatorFn => (value, field) => {
    if (typeof value === 'number' && value < min) {
      return `${field} must be at least ${min}`
    }
    return null
  },

  /**
   * Validates maximum number value
   */
  max: (max: number): ValidatorFn => (value, field) => {
    if (typeof value === 'number' && value > max) {
      return `${field} must be at most ${max}`
    }
    return null
  },
}

/**
 * Create a schema field with validators
 */
export function field<T>(
  validatorFns: ValidatorFn<T>[],
  options: { optional?: boolean } = {}
): SchemaField<T> {
  return {
    validators: validatorFns,
    optional: options.optional,
  }
}

/**
 * Validate data against a schema
 */
export function validate(data: any, schema: Schema): SchemaValidationResult {
  const errors: ValidationError[] = []

  for (const [fieldName, fieldSchema] of Object.entries(schema)) {
    const value = data[fieldName]

    // Skip validation for optional fields that are undefined
    if (fieldSchema.optional && (value === undefined || value === null)) {
      continue
    }

    // Run each validator for this field
    for (const validator of fieldSchema.validators) {
      const error = validator(value, fieldName)
      if (error) {
        errors.push({ field: fieldName, message: error })
        break // Stop on first error for this field
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

/**
 * Helper to create a schema
 */
export function schema(fields: Schema): Schema {
  return fields
}
