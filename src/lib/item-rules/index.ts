/**
 * Pure, dependency-free item rules: priority scoring and input validation.
 *
 * These functions never touch the wall clock or any ambient state — the
 * current time is passed in explicitly. The `ItemService` adapter
 * (`@/services/item-service`) supplies the real clock and exposes the same
 * public API the rest of the app already uses.
 */

export {
  type PriorityLevel,
  MS_PER_DAY,
  URGENT_STATUS,
  URGENT_SCORE,
  AGE_THRESHOLD_DAYS,
  AGE_SCORE_PER_DAY,
  PRIORITY_SCORE_THRESHOLDS,
  ageInDays,
  scorePriority,
  classifyPriority,
  computePriority,
} from './priority'

export {
  type ValidationResult,
  type AllowedStatus,
  type ValidationRule,
  ALLOWED_STATUSES,
  requireName,
  validStatus,
  ITEM_VALIDATION_RULES,
  validateItem,
} from './validation'
