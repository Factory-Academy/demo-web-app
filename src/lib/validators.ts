/**
 * Schema-lite validation utilities for runtime type checking and data validation.
 */

export interface ValidationError {
  field: string
  message: string
}

export interface ValidationResult {
  valid: boolean
  errors: ValidationError[]
}

export type Validator<T = any> = (value: T, field: string) => ValidationError | null

/**
 * Composes multiple validators into a single validator function.
 */
export function compose<T>(...validators: Validator<T>[]): Validator<T> {
  return (value: T, field: string): ValidationError | null => {
    for (const validator of validators) {
      const error = validator(value, field)
      if (error) return error
    }
    return null
  }
}

/**
 * Validates that a value is required (not null, undefined, or empty string).
 */
export function required(value: any, field: string): ValidationError | null {
  if (value === null || value === undefined || value === '') {
    return { field, message: `${field} is required` }
  }
  return null
}

/**
 * Validates that a string value meets minimum length requirements.
 */
export function minLength(min: number): Validator<string> {
  return (value: string, field: string): ValidationError | null => {
    if (typeof value === 'string' && value.trim().length < min) {
      return { field, message: `${field} must be at least ${min} characters` }
    }
    return null
  }
}

/**
 * Validates that a string value does not exceed maximum length.
 */
export function maxLength(max: number): Validator<string> {
  return (value: string, field: string): ValidationError | null => {
    if (typeof value === 'string' && value.length > max) {
      return { field, message: `${field} must not exceed ${max} characters` }
    }
    return null
  }
}

/**
 * Validates that a value is one of the allowed enum values.
 */
export function oneOf<T>(allowed: T[]): Validator<T> {
  return (value: T, field: string): ValidationError | null => {
    if (!allowed.includes(value)) {
      return { field, message: `${field} must be one of: ${allowed.join(', ')}` }
    }
    return null
  }
}

/**
 * Validates that a value is a valid string type.
 */
export function isString(value: any, field: string): ValidationError | null {
  if (typeof value !== 'string') {
    return { field, message: `${field} must be a string` }
  }
  return null
}

/**
 * Validates that a value is a valid number type.
 */
export function isNumber(value: any, field: string): ValidationError | null {
  if (typeof value !== 'number' || isNaN(value)) {
    return { field, message: `${field} must be a number` }
  }
  return null
}

/**
 * Schema validator that validates an object against a field schema.
 */
export interface Schema {
  [field: string]: {
    required?: boolean
    validator?: Validator
  }
}

/**
 * Validates an object against a schema definition.
 */
export function validate(data: any, schema: Schema): ValidationResult {
  const errors: ValidationError[] = []

  for (const [field, rules] of Object.entries(schema)) {
    const value = data[field]

    // Check required fields
    if (rules.required) {
      const error = required(value, field)
      if (error) {
        errors.push(error)
        continue
      }
    }

    // Skip validation if field is optional and not provided
    if (!rules.required && (value === undefined || value === null)) {
      continue
    }

    // Apply field validator
    if (rules.validator) {
      const error = rules.validator(value, field)
      if (error) {
        errors.push(error)
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}
