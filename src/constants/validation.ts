/**
 * Validation constraints for item data.
 * These constants define the business rules for item validation.
 */

/** Minimum length for item names (characters) */
export const MIN_NAME_LENGTH = 3

/** Maximum length for item names (characters) */
export const MAX_NAME_LENGTH = 100

/** Maximum length for item descriptions (characters) */
export const MAX_DESCRIPTION_LENGTH = 500

/**
 * Priority calculation constants.
 */

/** Milliseconds in a day, used for age-based priority calculations */
export const MS_PER_DAY = 86400000

/** Base score boost for urgent items */
export const URGENT_BASE_SCORE = 50

/** Threshold in days for age-based score bonus */
export const AGE_THRESHOLD_DAYS = 30

/** Multiplier applied to days over the age threshold */
export const AGE_SCORE_MULTIPLIER = 0.5

/** Priority score threshold for critical level */
export const CRITICAL_SCORE_THRESHOLD = 80

/** Priority score threshold for high level */
export const HIGH_SCORE_THRESHOLD = 50

/** Priority score threshold for medium level */
export const MEDIUM_SCORE_THRESHOLD = 20
