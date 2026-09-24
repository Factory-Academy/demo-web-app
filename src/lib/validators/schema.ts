/**
 * Lightweight schema-lite validator for input validation.
 * Provides simple, composable validators without heavy external dependencies.
 */

export interface ValidationError {
  field: string
  message: string
}

export interface ValidationResult {
  valid: boolean
  errors: ValidationError[]
}

/**
 * Base validator type that returns true if valid, false if invalid
 */
type ValidatorFn = (value: unknown) => boolean

/**
 * Schema definition using simple validator functions
 */
export type Schema<T> = {
  [K in keyof T]?: ValidatorFn
}

/**
 * Validates data against a schema
 * @param data - The data to validate
 * @param schema - The schema definition
 * @returns Validation result with errors if any
 */
export function validateSchema<T extends Record<string, unknown>>(
  data: unknown,
  schema: Schema<T>,
): ValidationResult {
  const errors: ValidationError[] = []

  if (typeof data !== 'object' || data === null) {
    return {
      valid: false,
      errors: [{ field: 'root', message: 'Input must be an object' }],
    }
  }

  const obj = data as Record<string, unknown>

  for (const [field, validator] of Object.entries(schema)) {
    if (validator && !validator(obj[field])) {
      errors.push({
        field,
        message: `Validation failed for field "${field}"`,
      })
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

/**
 * Common validators for reuse
 */
export const validators = {
  /**
   * String validator: checks for non-empty, trimmed string
   */
  string: (value: unknown): boolean => typeof value === 'string' && value.trim().length > 0,

  /**
   * Optional string: allows undefined or non-empty string
   */
  stringOptional: (value: unknown): boolean =>
    value === undefined || (typeof value === 'string' && value.trim().length > 0),

  /**
   * Enum validator: checks if value is in allowed list
   */
  enum: (allowedValues: string[]) => (value: unknown): boolean =>
    typeof value === 'string' && allowedValues.includes(value),

  /**
   * Optional enum: allows undefined or value in allowed list
   */
  enumOptional: (allowedValues: string[]) => (value: unknown): boolean =>
    value === undefined || (typeof value === 'string' && allowedValues.includes(value)),
}
