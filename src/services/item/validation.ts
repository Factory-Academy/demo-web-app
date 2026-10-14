import { Item } from '@/models/item'

/**
 * Pure validation for item input. No I/O, no clock, no throwing: callers get
 * back a result object they can turn into an HTTP response or a form error.
 */

export interface ValidationResult {
  valid: boolean
  errors: string[]
}

export const VALID_STATUSES = ['active', 'pending', 'completed'] as const
export type ValidStatus = (typeof VALID_STATUSES)[number]

export const ValidationMessages = {
  nameRequired: 'Name is required',
  invalidStatus: 'Invalid status',
} as const

/** True when `status` is one of the accepted values. */
export function isValidStatus(status: string): status is ValidStatus {
  return (VALID_STATUSES as readonly string[]).includes(status)
}

export function validateItem(data: Partial<Item>): ValidationResult {
  const errors: string[] = []

  if (!data.name?.trim()) {
    errors.push(ValidationMessages.nameRequired)
  }

  // An empty/missing status is allowed here; only a present, unknown value is
  // rejected. This matches the create flow, where status defaults later.
  if (data.status && !isValidStatus(data.status)) {
    errors.push(ValidationMessages.invalidStatus)
  }

  return { valid: errors.length === 0, errors }
}
