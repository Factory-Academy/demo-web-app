/**
 * Constants for ItemService priority calculation and validation rules.
 */

// Priority calculation thresholds
export const CRITICAL_PRIORITY_THRESHOLD = 80
export const HIGH_PRIORITY_THRESHOLD = 50
export const MEDIUM_PRIORITY_THRESHOLD = 20

// Priority scoring factors
export const URGENT_STATUS_SCORE = 50
export const AGE_THRESHOLD_DAYS = 30
export const AGE_SCORE_MULTIPLIER = 0.5
export const MS_PER_DAY = 86400000

// Validation constraints
export const MIN_NAME_LENGTH = 3
export const MAX_NAME_LENGTH = 100
export const MAX_DESCRIPTION_LENGTH = 500
