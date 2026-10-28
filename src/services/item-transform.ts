import { Item } from '@/models/item'
import { MAX_DESCRIPTION_LENGTH, MAX_NAME_LENGTH, isValidStatus } from '@/services/validation'
import { parseInstant, toIsoString } from '@/services/time'

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
 *
 * `maxLength` counts UTF-16 code units (matching `String.length`, the unit the
 * validation layer caps on), but truncation never splits a surrogate pair: an
 * astral codepoint (emoji, CJK extension B, etc.) straddling the limit is
 * dropped whole rather than leaving a lone surrogate behind. Whitespace exposed
 * by truncation is trimmed off the result.
 */
export function toSafeString(value: unknown, maxLength: number): string {
  if (typeof value !== 'string') return ''
  const trimmed = value.trim()
  if (trimmed.length <= maxLength) return trimmed

  let end = maxLength
  // A high surrogate (0xD800–0xDBFF) at the cut point is the first half of a
  // pair whose second half falls past the limit; back up so it isn't orphaned.
  const lastUnit = trimmed.charCodeAt(end - 1)
  if (lastUnit >= 0xd800 && lastUnit <= 0xdbff) end -= 1

  return trimmed.slice(0, end).trim()
}

/** Normalize a status, falling back to DEFAULT_STATUS for unknown values. */
export function normalizeStatus(value: unknown): string {
  return isValidStatus(value) ? value : DEFAULT_STATUS
}

/**
 * Normalize a timestamp into an ISO-8601 string. Unparseable or out-of-range
 * values fall back to `fallback` (defaults to now) so downstream date math
 * never sees `NaN` and the conversion never throws a `RangeError`. If the
 * fallback itself is somehow unrepresentable, the current time is used.
 */
export function normalizeTimestamp(value: unknown, fallback: number = Date.now()): string {
  const parsed = parseInstant(value)
  return toIsoString(parsed ?? fallback) ?? new Date().toISOString()
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
