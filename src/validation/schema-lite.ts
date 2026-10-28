export type ValidationResult<T> =
  | { success: true; data: T }
  | { success: false; errors: string[] }

type FieldRule<T> = (value: unknown, fieldName: string) => ValidationResult<T>

export const schemaLite = {
  string(options?: { trim?: boolean }): FieldRule<string> {
    const trim = options?.trim ?? false

    return (value, fieldName) => {
      if (value === undefined || value === null) {
        return { success: false, errors: [`${fieldName} is required`] }
      }

      if (typeof value !== 'string') {
        return { success: false, errors: [`${fieldName} must be a string`] }
      }

      const nextValue = trim ? value.trim() : value
      if (nextValue.length === 0) {
        return { success: false, errors: [`${fieldName} is required`] }
      }

      return { success: true, data: nextValue }
    }
  },

  optionalString(options?: { trim?: boolean }): FieldRule<string | undefined> {
    const trim = options?.trim ?? false

    return (value, fieldName) => {
      if (value === undefined || value === null) {
        return { success: true, data: undefined }
      }

      if (typeof value !== 'string') {
        return { success: false, errors: [`${fieldName} must be a string`] }
      }

      return { success: true, data: trim ? value.trim() : value }
    }
  },

  optionalEnum<T extends string>(allowedValues: T[]): FieldRule<T | undefined> {
    return (value, fieldName) => {
      if (value === undefined || value === null) {
        return { success: true, data: undefined }
      }

      if (typeof value !== 'string' || !allowedValues.includes(value as T)) {
        return {
          success: false,
          errors: [`${fieldName} must be one of: ${allowedValues.join(', ')}`],
        }
      }

      return { success: true, data: value as T }
    }
  },
}

export function validateSchema<T extends Record<string, unknown>>(
  input: unknown,
  schema: { [K in keyof T]: FieldRule<T[K]> }
): ValidationResult<T> {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return { success: false, errors: ['body must be an object'] }
  }

  const source = input as Record<string, unknown>
  const errors: string[] = []
  const data: Partial<T> = {}

  for (const fieldName of Object.keys(schema) as Array<keyof T>) {
    const rule = schema[fieldName] as FieldRule<unknown>
    const result = rule(source[fieldName as string], String(fieldName))

    if (!result.success) {
      errors.push(...result.errors)
      continue
    }

    if (result.data !== undefined) {
      data[fieldName] = result.data as T[keyof T]
    }
  }

  if (errors.length > 0) {
    return { success: false, errors }
  }

  return { success: true, data: data as T }
}
