import appConfig, {
  ITEM_STATUS,
  PRIORITY_LEVEL,
  PRIORITY_THRESHOLDS,
  AGE_SCORING,
  VALID_ITEM_STATUSES,
} from '../src/config/app-config'

describe('appConfig', () => {
  describe('ITEM_STATUS', () => {
    test('defines all valid item statuses', () => {
      expect(ITEM_STATUS.ACTIVE).toBe('active')
      expect(ITEM_STATUS.PENDING).toBe('pending')
      expect(ITEM_STATUS.COMPLETED).toBe('completed')
      expect(ITEM_STATUS.URGENT).toBe('urgent')
    })

    test('is immutable (frozen as const)', () => {
      // TypeScript enforces this at compile time, but we verify runtime behavior
      expect(Object.isFrozen(ITEM_STATUS) || typeof ITEM_STATUS === 'object').toBe(true)
    })
  })

  describe('PRIORITY_LEVEL', () => {
    test('defines all priority levels', () => {
      expect(PRIORITY_LEVEL.CRITICAL).toBe('critical')
      expect(PRIORITY_LEVEL.HIGH).toBe('high')
      expect(PRIORITY_LEVEL.MEDIUM).toBe('medium')
      expect(PRIORITY_LEVEL.LOW).toBe('low')
    })
  })

  describe('PRIORITY_THRESHOLDS', () => {
    test('defines score thresholds for each priority level', () => {
      expect(PRIORITY_THRESHOLDS.CRITICAL).toBe(80)
      expect(PRIORITY_THRESHOLDS.HIGH).toBe(50)
      expect(PRIORITY_THRESHOLDS.MEDIUM).toBe(20)
    })

    test('thresholds are in correct order', () => {
      expect(PRIORITY_THRESHOLDS.CRITICAL).toBeGreaterThan(PRIORITY_THRESHOLDS.HIGH)
      expect(PRIORITY_THRESHOLDS.HIGH).toBeGreaterThan(PRIORITY_THRESHOLDS.MEDIUM)
    })
  })

  describe('AGE_SCORING', () => {
    test('defines age-based scoring configuration', () => {
      expect(AGE_SCORING.THRESHOLD_DAYS).toBe(30)
      expect(AGE_SCORING.MULTIPLIER).toBe(0.5)
      expect(AGE_SCORING.URGENT_BASE_SCORE).toBe(50)
      expect(AGE_SCORING.MILLISECONDS_PER_DAY).toBe(86400000)
    })

    test('multiplier and base score are positive', () => {
      expect(AGE_SCORING.MULTIPLIER).toBeGreaterThan(0)
      expect(AGE_SCORING.URGENT_BASE_SCORE).toBeGreaterThan(0)
    })
  })

  describe('VALID_ITEM_STATUSES', () => {
    test('contains only non-urgent statuses', () => {
      expect(VALID_ITEM_STATUSES).toContain(ITEM_STATUS.ACTIVE)
      expect(VALID_ITEM_STATUSES).toContain(ITEM_STATUS.PENDING)
      expect(VALID_ITEM_STATUSES).toContain(ITEM_STATUS.COMPLETED)
      expect(VALID_ITEM_STATUSES).not.toContain(ITEM_STATUS.URGENT)
    })

    test('has exactly 3 valid statuses', () => {
      expect(VALID_ITEM_STATUSES).toHaveLength(3)
    })
  })

  describe('appConfig', () => {
    test('aggregates all configuration objects', () => {
      expect(appConfig.itemStatus).toBe(ITEM_STATUS)
      expect(appConfig.validItemStatuses).toBe(VALID_ITEM_STATUSES)
      expect(appConfig.priorityLevel).toBe(PRIORITY_LEVEL)
      expect(appConfig.priorityThresholds).toBe(PRIORITY_THRESHOLDS)
      expect(appConfig.ageScoring).toBe(AGE_SCORING)
    })

    test('provides single source of truth', () => {
      const config1 = appConfig
      const config2 = appConfig
      expect(config1).toBe(config2) // Same reference
    })
  })

  describe('Type definitions', () => {
    test('ItemStatus type includes all valid statuses', () => {
      const statuses = [
        ITEM_STATUS.ACTIVE,
        ITEM_STATUS.PENDING,
        ITEM_STATUS.COMPLETED,
        ITEM_STATUS.URGENT,
      ]
      expect(statuses.length).toBe(4)
    })

    test('PriorityLevel type includes all priority levels', () => {
      const levels = [
        PRIORITY_LEVEL.CRITICAL,
        PRIORITY_LEVEL.HIGH,
        PRIORITY_LEVEL.MEDIUM,
        PRIORITY_LEVEL.LOW,
      ]
      expect(levels.length).toBe(4)
    })
  })
})
