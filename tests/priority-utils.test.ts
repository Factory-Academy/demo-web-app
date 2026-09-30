import { scoreToPriorityLevel } from '../src/utils/priority-utils'

describe('priority-utils', () => {
  describe('scoreToPriorityLevel', () => {
    test('returns critical for scores >= 80', () => {
      expect(scoreToPriorityLevel(80)).toBe('critical')
      expect(scoreToPriorityLevel(90)).toBe('critical')
      expect(scoreToPriorityLevel(100)).toBe('critical')
    })

    test('returns high for scores >= 50 and < 80', () => {
      expect(scoreToPriorityLevel(50)).toBe('high')
      expect(scoreToPriorityLevel(65)).toBe('high')
      expect(scoreToPriorityLevel(79)).toBe('high')
    })

    test('returns medium for scores >= 20 and < 50', () => {
      expect(scoreToPriorityLevel(20)).toBe('medium')
      expect(scoreToPriorityLevel(35)).toBe('medium')
      expect(scoreToPriorityLevel(49)).toBe('medium')
    })

    test('returns low for scores < 20', () => {
      expect(scoreToPriorityLevel(0)).toBe('low')
      expect(scoreToPriorityLevel(10)).toBe('low')
      expect(scoreToPriorityLevel(19)).toBe('low')
    })

    test('handles boundary values correctly', () => {
      expect(scoreToPriorityLevel(19.9)).toBe('low')
      expect(scoreToPriorityLevel(20)).toBe('medium')
      expect(scoreToPriorityLevel(49.9)).toBe('medium')
      expect(scoreToPriorityLevel(50)).toBe('high')
      expect(scoreToPriorityLevel(79.9)).toBe('high')
      expect(scoreToPriorityLevel(80)).toBe('critical')
    })
  })
})
