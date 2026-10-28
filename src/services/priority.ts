import { Item } from '@/models/item'

export type Priority = 'critical' | 'high' | 'medium' | 'low'

/** Score at or above which each priority bucket applies. */
export const PRIORITY_THRESHOLDS = {
  critical: 80,
  high: 50,
  medium: 20,
} as const

/** Flat bonus added when a record is explicitly marked urgent. */
export const URGENT_STATUS_BONUS = 50

/** Records only start accruing an age score once they are older than this. */
export const AGE_SCORE_START_DAYS = 30

/** Score added per day beyond AGE_SCORE_START_DAYS. */
export const AGE_SCORE_PER_DAY = 0.5

/**
 * Upper bound on the age (in days) used for scoring. Guards against runaway
 * scores and overflow from malformed far-future/far-past timestamps such as
 * a stray `year 9999` value.
 */
export const MAX_AGE_DAYS = 3650

const MS_PER_DAY = 86_400_000

/**
 * Parse a timestamp from a string or epoch-millis number. Returns `null` for
 * anything that cannot be resolved to a finite instant (malformed strings,
 * `NaN`, `Infinity`, objects, `null`/`undefined`).
 */
export function parseTimestamp(value: unknown): number | null {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null
  }
  if (typeof value === 'string') {
    const ms = Date.parse(value)
    return Number.isNaN(ms) ? null : ms
  }
  return null
}

/**
 * Age of a record in whole days, clamped to `[0, MAX_AGE_DAYS]`.
 *
 * Returns `0` when the timestamp is unparseable so a malformed date never
 * poisons the score with `NaN`. Future timestamps clamp to `0` rather than
 * producing a negative age.
 */
export function computeAgeInDays(createdAt: unknown, now: number = Date.now()): number {
  const created = parseTimestamp(createdAt)
  if (created === null) return 0

  const ageDays = Math.floor((now - created) / MS_PER_DAY)
  if (!Number.isFinite(ageDays)) return 0

  return Math.min(Math.max(ageDays, 0), MAX_AGE_DAYS)
}

/** Portion of the score that comes from a record's age. */
export function computeAgeScore(ageDays: number): number {
  if (ageDays <= AGE_SCORE_START_DAYS) return 0
  return ageDays * AGE_SCORE_PER_DAY
}

/** Total score for a record, combining the urgent bonus and the age score. */
export function computeBaseScore(record: Partial<Item>, now?: number): number {
  let score = 0
  if (record.status === 'urgent') score += URGENT_STATUS_BONUS
  score += computeAgeScore(computeAgeInDays(record.createdAt, now))
  return score
}

/** Map a numeric score onto a priority bucket. */
export function scoreToPriority(score: number): Priority {
  if (!Number.isFinite(score)) return 'low'
  if (score >= PRIORITY_THRESHOLDS.critical) return 'critical'
  if (score >= PRIORITY_THRESHOLDS.high) return 'high'
  if (score >= PRIORITY_THRESHOLDS.medium) return 'medium'
  return 'low'
}

/**
 * Priority for a record. Tolerant of missing/`null` records and of malformed
 * timestamps; both degrade gracefully to `'low'` rather than throwing.
 *
 * `now` is injectable to keep scoring deterministic in tests.
 */
export function calculatePriority(
  record: Partial<Item> | null | undefined,
  now?: number,
): Priority {
  if (!record) return 'low'
  return scoreToPriority(computeBaseScore(record, now))
}
