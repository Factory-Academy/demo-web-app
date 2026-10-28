/**
 * Application configuration and constants
 */

export const PRIORITY_LEVELS = {
  CRITICAL: 'critical',
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low',
} as const

export type PriorityLevel = typeof PRIORITY_LEVELS[keyof typeof PRIORITY_LEVELS]

export const PRIORITY_THRESHOLDS = {
  CRITICAL: 80,
  HIGH: 50,
  MEDIUM: 20,
} as const

export const ITEM_STATUSES = {
  ACTIVE: 'active',
  PENDING: 'pending',
  COMPLETED: 'completed',
  URGENT: 'urgent',
} as const

export type ItemStatus = typeof ITEM_STATUSES[keyof typeof ITEM_STATUSES]

export const VALID_ITEM_STATUSES = [
  ITEM_STATUSES.ACTIVE,
  ITEM_STATUSES.PENDING,
  ITEM_STATUSES.COMPLETED,
] as const

export const PRIORITY_CALCULATION = {
  /** Milliseconds per day (used for age calculation) */
  MS_PER_DAY: 86400000,
  /** Days threshold for age-based priority boost */
  AGE_THRESHOLD_DAYS: 30,
  /** Base score added for urgent status */
  URGENT_SCORE: 50,
  /** Score multiplier per day over threshold */
  AGE_SCORE_MULTIPLIER: 0.5,
} as const

export const VALIDATION_MESSAGES = {
  NAME_REQUIRED: 'Name is required',
  INVALID_STATUS: 'Invalid status',
} as const

export const UI_LABELS = {
  NO_ITEMS_FOUND: 'No items found.',
  NO_ITEMS_FOUND_CLASS: 'text-gray-500',
} as const
