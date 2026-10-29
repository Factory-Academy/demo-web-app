/**
 * Shared validation error type for consistent error handling across services
 */
export interface ValidationResult<T = void> {
  success: boolean
  data?: T
  errors: ValidationError[]
}

export interface ValidationError {
  field?: string
  message: string
  code: string
}

export class ValidationErrorBuilder {
  private errors: ValidationError[] = []

  addError(message: string, code: string, field?: string): this {
    this.errors.push({ field, message, code })
    return this
  }

  addFieldError(field: string, message: string, code: string): this {
    return this.addError(message, code, field)
  }

  build<T = void>(data?: T): ValidationResult<T> {
    return {
      success: this.errors.length === 0,
      data,
      errors: this.errors,
    }
  }

  hasErrors(): boolean {
    return this.errors.length > 0
  }
}

/**
 * Helper to create a successful validation result
 */
export function validationSuccess<T>(data?: T): ValidationResult<T> {
  return {
    success: true,
    data,
    errors: [],
  }
}

/**
 * Helper to create a failed validation result
 */
export function validationFailure(errors: ValidationError[]): ValidationResult {
  return {
    success: false,
    errors,
  }
}
