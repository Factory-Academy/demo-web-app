/**
 * Shared tuning values for the item data-transform path.
 *
 * Centralising these keeps priority scoring and validation in agreement and
 * gives the regression tests a single source of truth to assert against.
 */

export const VALID_STATUSES = ['active', 'pending', 'completed'] as const

export type ItemStatus = (typeof VALID_STATUSES)[number]

/**
 * Status values that contribute to the priority score. A status may be a valid
 * priority signal without being a persistable status, so this map is kept
 * separate from {@link VALID_STATUSES} on purpose.
 */
export const STATUS_PRIORITY_WEIGHTS: Record<string, number> = {
  urgent: 50,
}

export const MS_PER_DAY = 86_400_000

export const AGE_BONUS_THRESHOLD_DAYS = 30
export const AGE_BONUS_PER_DAY = 0.5

/**
 * Upper bound on the age (in days) that can feed the score. Without a clamp a
 * garbage or far-past timestamp would push the age bonus arbitrarily high.
 */
export const MAX_AGE_DAYS = 3650

export const PRIORITY_THRESHOLDS = {
  critical: 80,
  high: 50,
  medium: 20,
} as const

export const MAX_NAME_LENGTH = 200
export const MAX_DESCRIPTION_LENGTH = 2000
