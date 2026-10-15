import { MS_PER_DAY } from './constants'

/**
 * Parse an untrusted timestamp into a valid Date, or `null` when it cannot be
 * interpreted. Accepts ISO strings or Date instances; everything else
 * (`undefined`, `null`, empty strings, numbers, objects, "not-a-date") is
 * treated as unparseable rather than becoming an `Invalid Date`.
 */
export function parseTimestamp(value: unknown): Date | null {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value
  }
  if (typeof value !== 'string') return null
  if (value.trim().length === 0) return null

  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

/**
 * Age of a record in whole days.
 *
 * Returns 0 for unparseable timestamps and for records dated now or in the
 * future, so a bad `createdAt` can never leak `NaN` into the priority score.
 */
export function computeAgeInDays(value: unknown, now: Date = new Date()): number {
  const created = parseTimestamp(value)
  if (created === null) return 0

  const ageMs = now.getTime() - created.getTime()
  if (ageMs <= 0) return 0

  return Math.floor(ageMs / MS_PER_DAY)
}
