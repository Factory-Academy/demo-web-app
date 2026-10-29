import { PriorityLevel } from './types'

interface Threshold {
  level: PriorityLevel
  min: number
}

/** Ordered high-to-low; the first band whose `min` is met wins. */
export const PRIORITY_THRESHOLDS: ReadonlyArray<Threshold> = [
  { level: 'critical', min: 80 },
  { level: 'high', min: 50 },
  { level: 'medium', min: 20 },
  { level: 'low', min: 0 },
]

/** Coerce arbitrary strategy output into a finite, non-negative score. */
export function normalizeScore(score: number): number {
  if (!Number.isFinite(score) || score < 0) return 0
  return score
}

export function scoreToLevel(score: number): PriorityLevel {
  const value = normalizeScore(score)
  for (const threshold of PRIORITY_THRESHOLDS) {
    if (value >= threshold.min) return threshold.level
  }
  return 'low'
}
