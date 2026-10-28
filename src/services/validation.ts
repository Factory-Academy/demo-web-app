import { Item } from '@/models/item'

/**
 * Statuses a record may hold. `urgent` is included so the priority scorer's
 * urgent bonus can be reached by genuinely valid data — previously `urgent`
 * drove scoring but was rejected by validation, so no record could legally
 * be urgent.
 */
export const VALID_STATUSES = ['active', 'pending', 'completed', 'urgent'] as const

export type ValidStatus = (typeof VALID_STATUSES)[number]

export const MAX_NAME_LENGTH = 200
export const MAX_DESCRIPTION_LENGTH = 2000

export interface ValidationResult {
  valid: boolean
  errors: string[]
}

export function isValidStatus(status: unknown): status is ValidStatus {
  return (
    typeof status === 'string' &&
    (VALID_STATUSES as readonly string[]).includes(status)
  )
}

/** A name is required, must be a string, and must fit within the length cap. */
export function validateName(name: unknown): string[] {
  if (typeof name !== 'string' || name.trim().length === 0) {
    return ['Name is required']
  }
  if (name.length > MAX_NAME_LENGTH) {
    return [`Name must be ${MAX_NAME_LENGTH} characters or fewer`]
  }
  return []
}

/** Status is optional, but when present it must be one of VALID_STATUSES. */
export function validateStatus(status: unknown): string[] {
  if (status === undefined || status === null || status === '') return []
  return isValidStatus(status) ? [] : ['Invalid status']
}

/** Description is optional, but when present it must be a bounded string. */
export function validateDescription(description: unknown): string[] {
  if (description === undefined || description === null) return []
  if (typeof description !== 'string') {
    return ['Description must be a string']
  }
  if (description.length > MAX_DESCRIPTION_LENGTH) {
    return [`Description must be ${MAX_DESCRIPTION_LENGTH} characters or fewer`]
  }
  return []
}

/**
 * Validate a (possibly partial or missing) record. Tolerant of `null`/
 * `undefined` input, which is reported as a missing name rather than throwing.
 */
export function validateItem(
  data: Partial<Item> | null | undefined,
): ValidationResult {
  const record = data ?? {}
  const errors = [
    ...validateName(record.name),
    ...validateStatus(record.status),
    ...validateDescription(record.description),
  ]
  return { valid: errors.length === 0, errors }
}
