/**
 * Validation error carrying a list of specific validation failure messages.
 * Thrown when input data fails business or domain validation rules.
 */
export class ValidationError extends Error {
  constructor(public readonly errors: string[]) {
    super(`Validation failed: ${errors.join(', ')}`)
    this.name = 'ValidationError'
    // Required for `instanceof` under the ES5 compile target.
    Object.setPrototypeOf(this, ValidationError.prototype)
  }

  /** Convenience method to create and throw a ValidationError with a single message. */
  static throw(message: string): never {
    throw new ValidationError([message])
  }

  /** Convenience method to create and throw a ValidationError with multiple messages. */
  static throwAll(errors: string[]): never {
    throw new ValidationError(errors)
  }
}

/**
 * Validates that the given value is not null or undefined.
 * Throws ValidationError with the provided message if validation fails.
 */
export function requirePresent<T>(
  value: T | null | undefined,
  message: string,
): asserts value is T {
  if (value === null || value === undefined) {
    ValidationError.throw(message)
  }
}

/**
 * Validates that the given string is not empty or whitespace-only.
 * Throws ValidationError with the provided message if validation fails.
 */
export function requireNonEmpty(
  value: string | null | undefined,
  message: string,
): asserts value is string {
  if (!value || !value.trim()) {
    ValidationError.throw(message)
  }
}
