import { Item } from '@/models/item'

/**
 * Pure priority scoring for items.
 *
 * Nothing here reads the clock. Callers pass the reference time (`nowMs`),
 * which keeps every function deterministic and trivially testable. The thin
 * adapter in `item-service.ts` is responsible for supplying the real time.
 */

export type Priority = 'critical' | 'high' | 'medium' | 'low'

/** Fields the score actually depends on, so callers can pass partial records. */
export type Scorable = Pick<Item, 'status' | 'createdAt'>

export const MS_PER_DAY = 86_400_000

/** Age (in whole days) must exceed this before it contributes to the score. */
export const AGE_GRACE_DAYS = 30

export const PRIORITY_WEIGHTS = {
  /** Flat bonus applied when an item is flagged `urgent`. */
  urgentStatus: 50,
  /** Points added per day of age beyond the grace window. */
  perDayAfterGrace: 0.5,
} as const

/**
 * Score-to-label thresholds, highest first. A score maps to the first label
 * whose minimum it meets; anything below every threshold is `low`.
 */
export const PRIORITY_THRESHOLDS: ReadonlyArray<readonly [Priority, number]> = [
  ['critical', 80],
  ['high', 50],
  ['medium', 20],
]

/**
 * Whole days between `createdAt` and `nowMs`. An unparseable or future
 * `createdAt` yields `NaN` or a negative number; callers must treat those as
 * "no age contribution" rather than throwing.
 */
export function ageInDays(createdAt: string, nowMs: number): number {
  return Math.floor((nowMs - new Date(createdAt).getTime()) / MS_PER_DAY)
}

/** Raw numeric score for a record at a given instant. Never throws. */
export function scorePriority(record: Scorable, nowMs: number): number {
  let score = 0

  if (record.status === 'urgent') {
    score += PRIORITY_WEIGHTS.urgentStatus
  }

  const days = ageInDays(record.createdAt, nowMs)
  // `days > AGE_GRACE_DAYS` is false for NaN and negatives, so a bad or future
  // date simply contributes nothing.
  if (days > AGE_GRACE_DAYS) {
    score += days * PRIORITY_WEIGHTS.perDayAfterGrace
  }

  return score
}

/** Map a numeric score to a priority label. */
export function classifyPriority(score: number): Priority {
  for (const [label, min] of PRIORITY_THRESHOLDS) {
    if (score >= min) return label
  }
  return 'low'
}

/** Convenience: score a record and classify it in one step. */
export function computePriority(record: Scorable, nowMs: number): Priority {
  return classifyPriority(scorePriority(record, nowMs))
}
