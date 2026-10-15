import { Item } from '@/models/item'
import {
  AGE_BONUS_PER_DAY,
  AGE_BONUS_THRESHOLD_DAYS,
  MAX_AGE_DAYS,
  PRIORITY_THRESHOLDS,
  STATUS_PRIORITY_WEIGHTS,
} from './constants'
import { computeAgeInDays } from './dates'

export type PriorityLevel = 'critical' | 'high' | 'medium' | 'low'

export type PriorityInput = Partial<Item> | null | undefined

/** Score contribution from a record's status. Unknown statuses score 0. */
export function scoreFromStatus(status: unknown): number {
  if (typeof status !== 'string') return 0
  return STATUS_PRIORITY_WEIGHTS[status] ?? 0
}

/**
 * Score contribution from a record's age. Only records older than the
 * threshold contribute, and the age is clamped so a garbage timestamp cannot
 * produce an unbounded score.
 */
export function scoreFromAge(ageDays: number): number {
  if (!Number.isFinite(ageDays) || ageDays <= AGE_BONUS_THRESHOLD_DAYS) {
    return 0
  }
  const boundedAge = Math.min(ageDays, MAX_AGE_DAYS)
  return boundedAge * AGE_BONUS_PER_DAY
}

/** Map a numeric score onto a discrete priority level. */
export function scoreToLevel(score: number): PriorityLevel {
  if (!Number.isFinite(score) || score < 0) return 'low'
  if (score >= PRIORITY_THRESHOLDS.critical) return 'critical'
  if (score >= PRIORITY_THRESHOLDS.high) return 'high'
  if (score >= PRIORITY_THRESHOLDS.medium) return 'medium'
  return 'low'
}

/** Raw priority score for a single record. Safe against null/malformed input. */
export function calculatePriorityScore(record: PriorityInput, now?: Date): number {
  if (record == null || typeof record !== 'object') return 0
  return scoreFromStatus(record.status) + scoreFromAge(computeAgeInDays(record.createdAt, now))
}

/** Priority level for a single record. */
export function calculatePriority(record: PriorityInput, now?: Date): PriorityLevel {
  return scoreToLevel(calculatePriorityScore(record, now))
}

/**
 * Priority levels for a batch of records. Returns an empty array for empty or
 * non-array input and tolerates malformed entries element by element, so one
 * bad record never derails a large batch.
 */
export function calculatePriorities(records: ReadonlyArray<PriorityInput>, now?: Date): PriorityLevel[] {
  if (!Array.isArray(records) || records.length === 0) return []
  return records.map((record) => calculatePriority(record, now))
}
