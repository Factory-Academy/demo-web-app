/**
 * Validates that a required string field is not empty.
 * Trims whitespace before checking.
 * @param value - The value to validate
 * @param fieldName - The name of the field (for error messages)
 * @returns An error message if invalid, or null if valid
 */
export function validateRequiredField(value: string | undefined, fieldName: string): string | null {
  if (!value?.trim()) {
    return `${fieldName} is required`
  }
  return null
}

/**
 * Validates that a field matches one of allowed values (enum validation).
 * @param value - The value to validate
 * @param allowedValues - Array of allowed values
 * @param fieldName - The name of the field (for error messages)
 * @returns An error message if invalid, or null if valid
 */
export function validateEnumField(
  value: string | undefined,
  allowedValues: string[],
  fieldName: string
): string | null {
  if (value !== undefined && value.trim() !== '' && !allowedValues.includes(value)) {
    return `Invalid ${fieldName}`
  }
  return null
}

/**
 * Collects validation errors from an array of validation results.
 * Filters out null values (valid results).
 * @param validationResults - Array of validation results (string or null)
 * @returns Array of error messages
 */
export function collectValidationErrors(validationResults: (string | null)[]): string[] {
  return validationResults.filter((result): result is string => result !== null)
}
