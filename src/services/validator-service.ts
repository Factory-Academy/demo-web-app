import { Schema, validate, validators, ValidationResult } from '@/models/validators'
import { ItemCreate } from '@/models/item'

/**
 * Service for validating API inputs using schema-lite validators.
 * Provides predefined schemas for common data types.
 *
 * @example
 * const validator = new ValidatorService()
 * 
 * const result = validator.validateItemCreate({
 *   name: 'New Item',
 *   status: 'active'
 * })
 * 
 * if (!result.valid) {
 *   console.error('Validation errors:', result.errors)
 * }
 */
export class ValidatorService {
  /**
   * Schema for validating item creation requests
   */
  private readonly itemCreateSchema: Schema = {
    name: {
      validators: [
        validators.required(),
        validators.type('string'),
        validators.minLength(1),
        validators.maxLength(100),
      ],
    },
    description: {
      validators: [
        validators.type('string'),
        validators.maxLength(500),
      ],
      optional: true,
    },
    status: {
      validators: [
        validators.oneOf(['active', 'pending', 'completed']),
      ],
      optional: true,
    },
  }

  /**
   * Validates data for creating a new item
   *
   * @param data - The item data to validate
   * @returns Validation result with valid flag and error details
   *
   * @example
   * const result = validator.validateItemCreate({ name: 'Task', status: 'active' })
   * if (result.valid) {
   *   console.log('Item data is valid')
   * }
   */
  validateItemCreate(data: Partial<ItemCreate>): ValidationResult {
    return validate(data, this.itemCreateSchema)
  }

  /**
   * Creates a custom validator for ad-hoc validation needs
   *
   * @param schema - Custom schema definition
   * @returns Validation function
   *
   * @example
   * const customValidator = validator.createValidator({
   *   email: {
   *     validators: [validators.required(), validators.email()],
   *   },
   * })
   * const result = customValidator({ email: 'test@example.com' })
   */
  createValidator(schema: Schema): (data: any) => ValidationResult {
    return (data: any) => validate(data, schema)
  }
}
