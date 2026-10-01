/**
 * Result of a validation operation
 */
export interface ValidationResult {
  valid: boolean
  errors: string[]
}

/**
 * Create a validation result from an array of error messages
 * @param errors - Array of validation error messages
 * @returns Validation result indicating success or failure
 */
export function createValidationResult(errors: string[]): ValidationResult {
  return {
    valid: errors.length === 0,
    errors
  }
}
