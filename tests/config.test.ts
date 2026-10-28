import {
  PRIORITY_LEVELS,
  PRIORITY_THRESHOLDS,
  ITEM_STATUSES,
  VALID_ITEM_STATUSES,
  PRIORITY_CALCULATION,
  VALIDATION_MESSAGES,
  UI_LABELS,
} from '../src/config/constants'

describe('Config Constants', () => {
  describe('PRIORITY_LEVELS', () => {
    test('should have all priority levels defined', () => {
      expect(PRIORITY_LEVELS.CRITICAL).toBe('critical')
      expect(PRIORITY_LEVELS.HIGH).toBe('high')
      expect(PRIORITY_LEVELS.MEDIUM).toBe('medium')
      expect(PRIORITY_LEVELS.LOW).toBe('low')
    })
  })

  describe('PRIORITY_THRESHOLDS', () => {
    test('should have thresholds in descending order', () => {
      expect(PRIORITY_THRESHOLDS.CRITICAL).toBeGreaterThan(PRIORITY_THRESHOLDS.HIGH)
      expect(PRIORITY_THRESHOLDS.HIGH).toBeGreaterThan(PRIORITY_THRESHOLDS.MEDIUM)
      expect(PRIORITY_THRESHOLDS.CRITICAL).toBe(80)
      expect(PRIORITY_THRESHOLDS.HIGH).toBe(50)
      expect(PRIORITY_THRESHOLDS.MEDIUM).toBe(20)
    })
  })

  describe('ITEM_STATUSES', () => {
    test('should have all item statuses defined', () => {
      expect(ITEM_STATUSES.ACTIVE).toBe('active')
      expect(ITEM_STATUSES.PENDING).toBe('pending')
      expect(ITEM_STATUSES.COMPLETED).toBe('completed')
      expect(ITEM_STATUSES.URGENT).toBe('urgent')
    })
  })

  describe('VALID_ITEM_STATUSES', () => {
    test('should include valid statuses only (not urgent)', () => {
      expect(VALID_ITEM_STATUSES).toContain(ITEM_STATUSES.ACTIVE)
      expect(VALID_ITEM_STATUSES).toContain(ITEM_STATUSES.PENDING)
      expect(VALID_ITEM_STATUSES).toContain(ITEM_STATUSES.COMPLETED)
      expect(VALID_ITEM_STATUSES).not.toContain(ITEM_STATUSES.URGENT)
    })

    test('should have length of 3', () => {
      expect(VALID_ITEM_STATUSES.length).toBe(3)
    })
  })

  describe('PRIORITY_CALCULATION', () => {
    test('should have correct calculation constants', () => {
      expect(PRIORITY_CALCULATION.MS_PER_DAY).toBe(86400000)
      expect(PRIORITY_CALCULATION.AGE_THRESHOLD_DAYS).toBe(30)
      expect(PRIORITY_CALCULATION.URGENT_SCORE).toBe(50)
      expect(PRIORITY_CALCULATION.AGE_SCORE_MULTIPLIER).toBe(0.5)
    })
  })

  describe('VALIDATION_MESSAGES', () => {
    test('should have validation messages defined', () => {
      expect(VALIDATION_MESSAGES.NAME_REQUIRED).toBe('Name is required')
      expect(VALIDATION_MESSAGES.INVALID_STATUS).toBe('Invalid status')
    })
  })

  describe('UI_LABELS', () => {
    test('should have UI labels defined', () => {
      expect(UI_LABELS.NO_ITEMS_FOUND).toBe('No items found.')
      expect(UI_LABELS.NO_ITEMS_FOUND_CLASS).toBe('text-gray-500')
    })
  })
})
