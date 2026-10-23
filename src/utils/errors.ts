/**
 * Shared error types for consistent error handling across the application.
 * All domain-specific errors extend the base Error class with proper
 * prototype chains for instanceof checks in ES5 compilation targets.
 */

/**
 * Error thrown when one or more validation rules fail. The errors array
 * contains human-readable messages describing each failure.
 */
export class ValidationError extends Error {
  constructor(
    public readonly errors: string[],
    message?: string,
  ) {
    super(message ?? `Validation failed: ${errors.join('; ')}`)
    this.name = 'ValidationError'
    // Required for `instanceof` under the ES5 compile target.
    Object.setPrototypeOf(this, ValidationError.prototype)
  }

  /** Single validation failure; creates an error with one message. */
  static single(error: string): ValidationError {
    return new ValidationError([error])
  }

  /** Check if an unknown error is a ValidationError with specific content. */
  static hasError(error: unknown, substring: string): boolean {
    return (
      error instanceof ValidationError &&
      error.errors.some((e) => e.includes(substring))
    )
  }
}

/**
 * Guard to check if an unknown value is a ValidationError. Narrows the type
 * for TypeScript.
 */
export function isValidationError(error: unknown): error is ValidationError {
  return error instanceof ValidationError
}

/**
 * Convert a validation result object to a ValidationError if invalid, or
 * return null if valid. Useful for migrating from return-value error
 * reporting to throw-based error handling.
 */
export function validationResultToError(result: {
  valid: boolean
  errors: string[]
}): ValidationError | null {
  return result.valid ? null : new ValidationError(result.errors)
}
