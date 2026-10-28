import { Item } from '@/models/item'
import { MAX_DESCRIPTION_LENGTH, MAX_NAME_LENGTH, isValidStatus } from '@/services/validation'
import { parseTimestamp } from '@/services/priority'

/** Status assigned when raw input omits or garbles the field. */
export const DEFAULT_STATUS = 'active'

/**
 * A record coerced into a safe, well-typed shape. The `id` is intentionally
 * absent — identity is assigned by the persistence layer, not by transforms.
 */
export type NormalizedItem = Omit<Item, 'id'>

/**
 * Coerce an arbitrary value into a trimmed string no longer than `maxLength`.
 * Non-string input yields an empty string. Over-long input is truncated rather
 * than rejected so a single oversized field can't drop an otherwise usable
 * record.
 */
export function toSafeString(value: unknown, maxLength: number): string {
  if (typeof value !== 'string') return ''
  const trimmed = value.trim()
  return trimmed.length > maxLength ? trimmed.slice(0, maxLength) : trimmed
}

/** Normalize a status, falling back to DEFAULT_STATUS for unknown values. */
export function normalizeStatus(value: unknown): string {
  return isValidStatus(value) ? value : DEFAULT_STATUS
}

/**
 * Normalize a timestamp into an ISO-8601 string. Unparseable values fall back
 * to `fallback` (defaults to now) so downstream date math never sees `NaN`.
 */
export function normalizeTimestamp(value: unknown, fallback: number = Date.now()): string {
  const ms = parseTimestamp(value)
  return new Date(ms ?? fallback).toISOString()
}

/**
 * Transform arbitrary, untrusted input into a NormalizedItem with every field
 * present and well-typed. Handles the empty case (`null`/`undefined`/`{}`),
 * malformed fields (wrong types, bad dates, unknown statuses), and oversized
 * strings. `now` is injectable for deterministic tests.
 */
export function normalizeItem(raw: unknown, now: number = Date.now()): NormalizedItem {
  const source = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>

  const name = toSafeString(source.name, MAX_NAME_LENGTH)
  const description = toSafeString(source.description, MAX_DESCRIPTION_LENGTH)

  const normalized: NormalizedItem = {
    name,
    status: normalizeStatus(source.status),
    createdAt: normalizeTimestamp(source.createdAt, now),
    updatedAt: normalizeTimestamp(source.updatedAt, now),
  }

  if (description.length > 0) {
    normalized.description = description
  }

  return normalized
}
