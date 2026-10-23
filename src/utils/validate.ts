/**
 * Schema-lite validation utilities for type-safe input validation
 */

export interface ValidationResult {
  valid: boolean
  errors: string[]
}

export type ValidatorFn<T = unknown> = (value: T, fieldName: string) => string | null

/**
 * Core validator builders
 */
export const validators = {
  /**
   * Validates that a value is a non-empty string
   */
  string: (options?: { minLength?: number; maxLength?: number; pattern?: RegExp }): ValidatorFn => {
    return (value, fieldName) => {
      if (typeof value !== 'string') {
        return `${fieldName} must be a string`
      }
      if (options?.minLength !== undefined && value.length < options.minLength) {
        return `${fieldName} must be at least ${options.minLength} characters`
      }
      if (options?.maxLength !== undefined && value.length > options.maxLength) {
        return `${fieldName} must be at most ${options.maxLength} characters`
      }
      if (options?.pattern && !options.pattern.test(value)) {
        return `${fieldName} has invalid format`
      }
      return null
    }
  },

  /**
   * Validates that a value is a number
   */
  number: (options?: { min?: number; max?: number; integer?: boolean }): ValidatorFn => {
    return (value, fieldName) => {
      if (typeof value !== 'number' || isNaN(value)) {
        return `${fieldName} must be a number`
      }
      if (options?.integer && !Number.isInteger(value)) {
        return `${fieldName} must be an integer`
      }
      if (options?.min !== undefined && value < options.min) {
        return `${fieldName} must be at least ${options.min}`
      }
      if (options?.max !== undefined && value > options.max) {
        return `${fieldName} must be at most ${options.max}`
      }
      return null
    }
  },

  /**
   * Validates that a value is a boolean
   */
  boolean: (): ValidatorFn => {
    return (value, fieldName) => {
      if (typeof value !== 'boolean') {
        return `${fieldName} must be a boolean`
      }
      return null
    }
  },

  /**
   * Validates that a value is one of the allowed enum values
   */
  enum: <T extends string | number>(allowedValues: readonly T[]): ValidatorFn => {
    return (value, fieldName) => {
      if (!allowedValues.includes(value as T)) {
        return `${fieldName} must be one of: ${allowedValues.join(', ')}`
      }
      return null
    }
  },

  /**
   * Validates that a value is a valid ISO date string
   */
  date: (): ValidatorFn => {
    return (value, fieldName) => {
      if (typeof value !== 'string') {
        return `${fieldName} must be a date string`
      }
      const date = new Date(value)
      if (isNaN(date.getTime())) {
        return `${fieldName} must be a valid date`
      }
      return null
    }
  },

  /**
   * Creates a custom validator function
   */
  custom: <T = unknown>(fn: (value: T) => boolean, errorMessage: string): ValidatorFn => {
    return (value, fieldName) => {
      return fn(value as T) ? null : errorMessage.replace('{field}', fieldName)
    }
  },
}

/**
 * Field schema definition
 */
export interface FieldSchema<T = unknown> {
  required?: boolean
  validators?: ValidatorFn<T>[]
}

/**
 * Object schema definition
 */
export type ObjectSchema<T extends Record<string, unknown>> = {
  [K in keyof T]?: FieldSchema<T[K]>
}

/**
 * Validates a single field against its schema
 */
function validateField<T>(
  value: T | undefined,
  fieldName: string,
  schema: FieldSchema<T>
): string[] {
  const errors: string[] = []

  // Check if required
  if (schema.required && (value === undefined || value === null || value === '')) {
    errors.push(`${fieldName} is required`)
    return errors
  }

  // Skip validation if value is undefined/null and not required
  if (value === undefined || value === null) {
    return errors
  }

  // Run validators
  if (schema.validators) {
    for (const validator of schema.validators) {
      const error = validator(value, fieldName)
      if (error) {
        errors.push(error)
      }
    }
  }

  return errors
}

/**
 * Validates an object against a schema
 */
export function validate<T extends Record<string, unknown>>(
  data: Partial<T>,
  schema: ObjectSchema<T>
): ValidationResult {
  const errors: string[] = []

  for (const [fieldName, fieldSchema] of Object.entries(schema)) {
    if (fieldSchema) {
      const fieldErrors = validateField(
        data[fieldName as keyof T],
        fieldName,
        fieldSchema as FieldSchema
      )
      errors.push(...fieldErrors)
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

/**
 * Creates a reusable validator function for a specific schema
 */
export function createValidator<T extends Record<string, unknown>>(
  schema: ObjectSchema<T>
): (data: Partial<T>) => ValidationResult {
  return (data: Partial<T>) => validate(data, schema)
}
