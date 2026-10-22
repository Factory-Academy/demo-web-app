/**
 * Pure priority scoring for items.
 *
 * The rules are a small, deterministic pipeline:
 *
 *   record + clock → score (number) → level ('critical'|'high'|'medium'|'low')
 *
 * Nothing here reads the wall clock or any other ambient state: the current
 * time is always passed in as `now` (epoch ms). That makes every function
 * referentially transparent and trivial to test without mocking globals. The
 * one impure caller — the real clock — lives in the `ItemService` adapter
 * (`@/services/item-service`).
 */

import { Item } from '@/models/item'

export type PriorityLevel = 'critical' | 'high' | 'medium' | 'low'

/** Milliseconds in a day; the unit `ageInDays` divides by. */
export const MS_PER_DAY = 86_400_000

/** A record in this status is treated as actively urgent. */
export const URGENT_STATUS = 'urgent'

/** Score contributed by an urgent status. */
export const URGENT_SCORE = 50

/** Age (in days) a record must exceed before age starts adding to the score. */
export const AGE_THRESHOLD_DAYS = 30

/** Score added per day of age, once past {@link AGE_THRESHOLD_DAYS}. */
export const AGE_SCORE_PER_DAY = 0.5

/** Minimum score for each level, evaluated from highest to lowest. */
export const PRIORITY_SCORE_THRESHOLDS = {
  critical: 80,
  high: 50,
  medium: 20,
} as const

/**
 * Whole days between `createdAt` and `now`.
 *
 * Returns `NaN` for an unparseable `createdAt`; callers guard on that via the
 * `> AGE_THRESHOLD_DAYS` comparison below (any comparison with `NaN` is
 * `false`), so a bad timestamp simply contributes no age score.
 */
export function ageInDays(createdAt: string, now: number): number {
  const ageMs = now - new Date(createdAt).getTime()
  return Math.floor(ageMs / MS_PER_DAY)
}

/**
 * Numeric priority score for a record at time `now`. Higher is more urgent.
 * The score is additive: an urgent status and sufficient age stack.
 */
export function scorePriority(record: Item, now: number): number {
  let score = 0
  if (record.status === URGENT_STATUS) score += URGENT_SCORE
  const age = ageInDays(record.createdAt, now)
  if (age > AGE_THRESHOLD_DAYS) score += age * AGE_SCORE_PER_DAY
  return score
}

/** Map a numeric score onto a discrete priority level. */
export function classifyPriority(score: number): PriorityLevel {
  if (score >= PRIORITY_SCORE_THRESHOLDS.critical) return 'critical'
  if (score >= PRIORITY_SCORE_THRESHOLDS.high) return 'high'
  if (score >= PRIORITY_SCORE_THRESHOLDS.medium) return 'medium'
  return 'low'
}

/** Convenience composition of {@link scorePriority} and {@link classifyPriority}. */
export function computePriority(record: Item, now: number): PriorityLevel {
  return classifyPriority(scorePriority(record, now))
}
