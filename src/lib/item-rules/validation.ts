/**
 * Pure validation rules for item input.
 *
 * Each rule is a small, independent function that inspects a partial item and
 * returns an error message (or `null` when the field is acceptable).
 * {@link validateItem} runs the rules in order and collects their messages.
 * Splitting the rules out keeps each one testable in isolation and makes the
 * rule set easy to extend without touching the aggregation logic.
 */

import { Item } from '@/models/item'

export interface ValidationResult {
  valid: boolean
  errors: string[]
}

/** Statuses accepted by {@link validStatus}. */
export const ALLOWED_STATUSES = ['active', 'pending', 'completed'] as const
export type AllowedStatus = (typeof ALLOWED_STATUSES)[number]

/** A single rule: an error message, or `null` when the field is acceptable. */
export type ValidationRule = (data: Partial<Item>) => string | null

/** Name must be present and not blank. */
export const requireName: ValidationRule = (data) =>
  data.name?.trim() ? null : 'Name is required'

/**
 * If a status is supplied it must be one of {@link ALLOWED_STATUSES}. An
 * absent (or empty) status is allowed here — presence is enforced elsewhere.
 */
export const validStatus: ValidationRule = (data) =>
  data.status && !ALLOWED_STATUSES.includes(data.status as AllowedStatus)
    ? 'Invalid status'
    : null

/** Default rule set, applied in order by {@link validateItem}. */
export const ITEM_VALIDATION_RULES: ReadonlyArray<ValidationRule> = [
  requireName,
  validStatus,
]

/**
 * Run each rule against `data` and collect the failures. The result is
 * `valid` only when no rule produced a message.
 */
export function validateItem(
  data: Partial<Item>,
  rules: ReadonlyArray<ValidationRule> = ITEM_VALIDATION_RULES,
): ValidationResult {
  const errors: string[] = []
  for (const rule of rules) {
    const error = rule(data)
    if (error !== null) errors.push(error)
  }
  return { valid: errors.length === 0, errors }
}
