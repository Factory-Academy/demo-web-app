import { Item } from '@/models/item'
import { MAX_DESCRIPTION_LENGTH, MAX_NAME_LENGTH, VALID_STATUSES } from './constants'

export interface ValidationResult {
  valid: boolean
  errors: string[]
}

const STATUS_OPTIONS: readonly string[] = VALID_STATUSES

export function validateName(name: unknown): string[] {
  if (name === undefined || name === null) return ['Name is required']
  if (typeof name !== 'string') return ['Name must be a string']
  if (name.trim().length === 0) return ['Name is required']
  if (name.length > MAX_NAME_LENGTH) {
    return [`Name must be ${MAX_NAME_LENGTH} characters or fewer`]
  }
  return []
}

export function validateStatus(status: unknown): string[] {
  if (status === undefined || status === null) return []
  if (typeof status !== 'string') return ['Invalid status']
  if (!STATUS_OPTIONS.includes(status)) return ['Invalid status']
  return []
}

export function validateDescription(description: unknown): string[] {
  if (description === undefined || description === null) return []
  if (typeof description !== 'string') return ['Description must be a string']
  if (description.length > MAX_DESCRIPTION_LENGTH) {
    return [`Description must be ${MAX_DESCRIPTION_LENGTH} characters or fewer`]
  }
  return []
}

/**
 * Validate an item payload. Each field is checked independently and defensively
 * so that malformed, non-object, or wrongly typed input returns errors instead
 * of throwing.
 */
export function validateItem(data: Partial<Item> | null | undefined): ValidationResult {
  if (data === undefined || data === null || typeof data !== 'object') {
    return { valid: false, errors: ['Item data is required'] }
  }

  const record = data as Record<string, unknown>
  const errors = [
    ...validateName(record.name),
    ...validateStatus(record.status),
    ...validateDescription(record.description),
  ]

  return { valid: errors.length === 0, errors }
}
