/**
 * Single source of truth for turning untrusted values into safe instants.
 *
 * The scoring and normalization paths both need to answer the same question —
 * "is this a usable point in time, and if so, which one?" — so the logic lives
 * here once instead of being re-derived (slightly differently) in each caller.
 */

export const MS_PER_DAY = 86_400_000

/**
 * Largest absolute epoch-millis value the ECMAScript `Date` type can represent
 * (±100,000,000 days from the epoch). A finite number outside this range is a
 * valid JS number but an invalid `Date`: `new Date(ms).toISOString()` throws a
 * `RangeError` for it. Rejecting such values here keeps that crash out of every
 * downstream caller.
 */
export const MAX_TIMESTAMP_MS = 8.64e15

/** True when `ms` is a finite instant that `Date` can represent and format. */
export function isValidInstant(ms: unknown): ms is number {
  return typeof ms === 'number' && Number.isFinite(ms) && Math.abs(ms) <= MAX_TIMESTAMP_MS
}

/**
 * Parse a timestamp from a string or epoch-millis number into a representable
 * instant. Returns `null` for anything that cannot be resolved to a finite,
 * in-range point in time: malformed strings, `NaN`, `Infinity`, numbers beyond
 * the `Date` range, objects, `null`/`undefined`.
 */
export function parseInstant(value: unknown): number | null {
  if (typeof value === 'number') {
    return isValidInstant(value) ? value : null
  }
  if (typeof value === 'string') {
    const ms = Date.parse(value)
    return isValidInstant(ms) ? ms : null
  }
  return null
}

/**
 * Format an instant as an ISO-8601 string without ever throwing. Returns `null`
 * for values `Date` cannot represent, so callers can substitute a fallback
 * instead of propagating a `RangeError`.
 */
export function toIsoString(ms: unknown): string | null {
  return isValidInstant(ms) ? new Date(ms).toISOString() : null
}
