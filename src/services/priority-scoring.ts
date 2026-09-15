import { PriorityLevel } from '@/models/priority-strategy'

/**
 * Number of milliseconds in a single day. Used for age calculations.
 */
export const MILLIS_PER_DAY = 86_400_000

/**
 * Score thresholds (inclusive lower bounds) that map a raw score onto a level.
 * Ordered from highest to lowest so the first match wins.
 */
const LEVEL_THRESHOLDS: ReadonlyArray<{ min: number; level: PriorityLevel }> = [
  { min: 80, level: 'critical' },
  { min: 50, level: 'high' },
  { min: 20, level: 'medium' },
  { min: -Infinity, level: 'low' },
]

/**
 * Computes the age of an item in whole days relative to a reference time.
 *
 * Accepts `createdAt` as an ISO string, epoch-millis number, or `Date`. The
 * result is clamped to be non-negative: unparseable, missing, or future dates
 * all yield `0` rather than producing `NaN` or negative ages that would skew a
 * score.
 *
 * @param createdAt - When the item was created
 * @param now - The reference time (defaults to `new Date()`)
 * @returns Whole days elapsed, never less than 0
 */
export function ageInDays(
  createdAt: string | number | Date | undefined,
  now: Date = new Date()
): number {
  if (createdAt === undefined || createdAt === null) return 0

  const createdMs = new Date(createdAt).getTime()
  if (Number.isNaN(createdMs)) return 0

  const ageMs = now.getTime() - createdMs
  if (ageMs <= 0) return 0

  return Math.floor(ageMs / MILLIS_PER_DAY)
}

/**
 * Maps a raw numeric score onto a discrete {@link PriorityLevel}.
 *
 * The mapping is shared by every strategy so that a "high" from one strategy is
 * directly comparable to a "high" from another. `NaN` scores are treated as the
 * lowest level to avoid surprising results.
 *
 * @param score - The raw score to bucket
 * @returns The level whose threshold the score meets
 */
export function scoreToLevel(score: number): PriorityLevel {
  if (Number.isNaN(score)) return 'low'
  for (const { min, level } of LEVEL_THRESHOLDS) {
    if (score >= min) return level
  }
  return 'low'
}
