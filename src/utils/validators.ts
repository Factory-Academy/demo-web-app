/**
 * Lightweight schema-like validators for input validation.
 * Provides composable validation functions with error accumulation.
 */

export type ValidationResult = {
  valid: boolean
  errors: Record<string, string>
}

export type Validator<T = unknown> = (value: unknown) => string | null

/**
 * Creates a validator that requires a non-empty string.
 * Returns error message or null if valid.
 */
export const stringRequired = (fieldName: string): Validator => {
  return (value: unknown) => {
    if (typeof value !== 'string' || !value.trim()) {
      return `${fieldName} is required`
    }
    return null
  }
}

/**
 * Creates a validator that requires a string to be one of the given options.
 */
export const stringEnum = (fieldName: string, options: string[]): Validator => {
  return (value: unknown) => {
    if (typeof value !== 'string' || !options.includes(value)) {
      return `${fieldName} must be one of: ${options.join(', ')}`
    }
    return null
  }
}

/**
 * Creates a validator that allows string optionally.
 */
export const stringOptional = (): Validator => {
  return (value: unknown) => {
    if (value !== undefined && value !== null && typeof value !== 'string') {
      return 'Value must be a string'
    }
    return null
  }
}

/**
 * Validates an object against a schema of validators.
 * Runs all validators and collects errors.
 */
export const validate = (
  data: Record<string, unknown>,
  schema: Record<string, Validator>,
): ValidationResult => {
  const errors: Record<string, string> = {}

  for (const [field, validator] of Object.entries(schema)) {
    const error = validator(data[field])
    if (error) {
      errors[field] = error
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  }
}
