/**
 * Schema-lite validation module for input validation.
 * Provides a lightweight, composable validation framework without external dependencies.
 */

export type ValidationError = {
  field: string
  message: string
}

export type ValidationResult = {
  valid: boolean
  errors: ValidationError[]
}

export type Validator<T = any> = (value: T, field: string) => ValidationError | null

/**
 * Built-in validators for common validation patterns
 */
export const validators = {
  /**
   * Validates that a value is required (not null, undefined, or empty string)
   */
  required: (): Validator => (value, field) => {
    if (value === null || value === undefined || value === '') {
      return { field, message: `${field} is required` }
    }
    return null
  },

  /**
   * Validates string minimum length
   */
  minLength: (min: number): Validator<string> => (value, field) => {
    if (typeof value === 'string' && value.length < min) {
      return { field, message: `${field} must be at least ${min} characters` }
    }
    return null
  },

  /**
   * Validates string maximum length
   */
  maxLength: (max: number): Validator<string> => (value, field) => {
    if (typeof value === 'string' && value.length > max) {
      return { field, message: `${field} must not exceed ${max} characters` }
    }
    return null
  },

  /**
   * Validates that a string value is one of the allowed values
   */
  oneOf: <T>(allowed: T[]): Validator<T> => (value, field) => {
    if (!allowed.includes(value)) {
      return { field, message: `${field} must be one of: ${allowed.join(', ')}` }
    }
    return null
  },

  /**
   * Validates that a value matches a regular expression pattern
   */
  pattern: (regex: RegExp, message?: string): Validator<string> => (value, field) => {
    if (typeof value === 'string' && !regex.test(value)) {
      return { field, message: message || `${field} has invalid format` }
    }
    return null
  },

  /**
   * Validates that a value is a valid email address
   */
  email: (): Validator<string> => (value, field) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (typeof value === 'string' && !emailRegex.test(value)) {
      return { field, message: `${field} must be a valid email address` }
    }
    return null
  },

  /**
   * Validates numeric range
   */
  range: (min: number, max: number): Validator<number> => (value, field) => {
    if (typeof value === 'number' && (value < min || value > max)) {
      return { field, message: `${field} must be between ${min} and ${max}` }
    }
    return null
  },

  /**
   * Validates that a value is of a specific type
   */
  type: (expectedType: 'string' | 'number' | 'boolean' | 'object'): Validator => (value, field) => {
    const actualType = typeof value
    if (actualType !== expectedType) {
      return { field, message: `${field} must be of type ${expectedType}` }
    }
    return null
  },
}

/**
 * Field schema definition for validation
 */
export type FieldSchema = {
  validators: Validator[]
  optional?: boolean
}

/**
 * Schema definition for object validation
 */
export type Schema = {
  [field: string]: FieldSchema
}

/**
 * Validates a single field against its schema
 */
export function validateField(
  value: any,
  field: string,
  schema: FieldSchema
): ValidationError[] {
  const errors: ValidationError[] = []

  // Skip validation for optional fields that are undefined or null
  if (schema.optional && (value === undefined || value === null)) {
    return errors
  }

  for (const validator of schema.validators) {
    const error = validator(value, field)
    if (error) {
      errors.push(error)
    }
  }

  return errors
}

/**
 * Validates an object against a schema
 */
export function validate(data: any, schema: Schema): ValidationResult {
  const errors: ValidationError[] = []

  for (const [field, fieldSchema] of Object.entries(schema)) {
    const value = data[field]
    const fieldErrors = validateField(value, field, fieldSchema)
    errors.push(...fieldErrors)
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}
