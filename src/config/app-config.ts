/**
 * Centralized application configuration with typed constants.
 * Replaces scattered magic numbers and string literals across services.
 */

export const ITEM_STATUS = {
  ACTIVE: 'active',
  PENDING: 'pending',
  COMPLETED: 'completed',
  URGENT: 'urgent',
} as const

export type ItemStatus = (typeof ITEM_STATUS)[keyof typeof ITEM_STATUS]

export const VALID_ITEM_STATUSES: ItemStatus[] = [
  ITEM_STATUS.ACTIVE,
  ITEM_STATUS.PENDING,
  ITEM_STATUS.COMPLETED,
]

export const PRIORITY_LEVEL = {
  CRITICAL: 'critical',
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low',
} as const

export type PriorityLevel = (typeof PRIORITY_LEVEL)[keyof typeof PRIORITY_LEVEL]

/**
 * Priority calculation configuration.
 * Thresholds determine which priority level an item gets based on calculated score.
 */
export const PRIORITY_THRESHOLDS = {
  CRITICAL: 80,
  HIGH: 50,
  MEDIUM: 20,
} as const

/**
 * Age-based scoring configuration.
 * Used in priority calculation to weight older items higher.
 */
export const AGE_SCORING = {
  THRESHOLD_DAYS: 30,
  MULTIPLIER: 0.5,
  URGENT_BASE_SCORE: 50,
  MILLISECONDS_PER_DAY: 86400000,
} as const

/**
 * Application configuration object.
 * Single source of truth for all application constants.
 */
export const appConfig = {
  itemStatus: ITEM_STATUS,
  validItemStatuses: VALID_ITEM_STATUSES,
  priorityLevel: PRIORITY_LEVEL,
  priorityThresholds: PRIORITY_THRESHOLDS,
  ageScoring: AGE_SCORING,
} as const

export default appConfig
