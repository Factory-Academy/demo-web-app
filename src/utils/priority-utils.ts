/**
 * Priority levels for record classification
 */
export type PriorityLevel = 'critical' | 'high' | 'medium' | 'low'

/**
 * Convert a numeric score to a priority level
 * @param score - Numeric score value
 * @returns Priority level based on threshold ranges
 */
export function scoreToPriorityLevel(score: number): PriorityLevel {
  if (score >= 80) return 'critical'
  if (score >= 50) return 'high'
  if (score >= 20) return 'medium'
  return 'low'
}
