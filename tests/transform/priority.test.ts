import {
  calculatePriorities,
  calculatePriority,
  calculatePriorityScore,
  scoreFromAge,
  scoreFromStatus,
  scoreToLevel,
} from '@/services/transform/priority'
import { MAX_AGE_DAYS } from '@/services/transform/constants'

const NOW = new Date('2024-06-01T00:00:00.000Z')

function daysAgo(days: number): string {
  return new Date(NOW.getTime() - days * 86_400_000).toISOString()
}

describe('scoreFromStatus', () => {
  test('weights urgent records', () => {
    expect(scoreFromStatus('urgent')).toBe(50)
  })

  test.each([['active'], ['pending'], ['completed'], ['unknown']])(
    'scores non-urgent status %s as 0',
    (status) => {
      expect(scoreFromStatus(status)).toBe(0)
    },
  )

  test.each([[undefined], [null], [42], [{}]])('scores non-string %p as 0', (value) => {
    expect(scoreFromStatus(value as unknown)).toBe(0)
  })
})

describe('scoreFromAge', () => {
  test('is 0 at or below the 30-day threshold', () => {
    expect(scoreFromAge(30)).toBe(0)
    expect(scoreFromAge(0)).toBe(0)
  })

  test('adds half a point per day beyond the threshold', () => {
    expect(scoreFromAge(100)).toBe(50)
  })

  test('clamps absurdly large ages', () => {
    expect(scoreFromAge(1_000_000)).toBe(MAX_AGE_DAYS * 0.5)
  })

  test.each([[NaN], [Infinity], [-5]])('is 0 for non-finite or negative age %p', (value) => {
    expect(scoreFromAge(value)).toBe(0)
  })
})

describe('scoreToLevel', () => {
  test.each([
    [80, 'critical'],
    [90, 'critical'],
    [50, 'high'],
    [79, 'high'],
    [20, 'medium'],
    [49, 'medium'],
    [0, 'low'],
    [19, 'low'],
  ])('maps score %p to %s', (score, level) => {
    expect(scoreToLevel(score)).toBe(level)
  })

  test.each([[NaN], [-10]])('maps invalid score %p to low', (score) => {
    expect(scoreToLevel(score)).toBe('low')
  })
})

describe('calculatePriorityScore / calculatePriority', () => {
  test('urgent + old escalates to critical', () => {
    expect(calculatePriority({ status: 'urgent', createdAt: daysAgo(61) }, NOW)).toBe('critical')
  })

  test('urgent alone is high', () => {
    expect(calculatePriority({ status: 'urgent', createdAt: daysAgo(0) }, NOW)).toBe('high')
  })

  test('old non-urgent reaches medium', () => {
    expect(calculatePriority({ status: 'active', createdAt: daysAgo(60) }, NOW)).toBe('medium')
  })

  test('recent non-urgent is low', () => {
    expect(calculatePriority({ status: 'active', createdAt: daysAgo(5) }, NOW)).toBe('low')
  })

  test('malformed createdAt does not inflate or corrupt the score', () => {
    const score = calculatePriorityScore({ status: 'urgent', createdAt: 'not-a-date' }, NOW)
    expect(Number.isNaN(score)).toBe(false)
    expect(score).toBe(50)
    expect(calculatePriority({ status: 'urgent', createdAt: '' }, NOW)).toBe('high')
  })

  test.each([[null], [undefined], ['string'], [42]])(
    'treats malformed record %p as lowest priority',
    (record) => {
      expect(calculatePriorityScore(record as unknown as never, NOW)).toBe(0)
      expect(calculatePriority(record as unknown as never, NOW)).toBe('low')
    },
  )
})

describe('calculatePriorities', () => {
  test('returns an empty array for empty input', () => {
    expect(calculatePriorities([], NOW)).toEqual([])
  })

  test('returns an empty array for non-array input', () => {
    expect(calculatePriorities(undefined as unknown as never, NOW)).toEqual([])
  })

  test('maps each record and tolerates malformed entries in a batch', () => {
    const result = calculatePriorities(
      [
        { status: 'urgent', createdAt: daysAgo(61) },
        null,
        { status: 'active', createdAt: 'garbage' },
      ],
      NOW,
    )
    expect(result).toEqual(['critical', 'low', 'low'])
  })

  test('handles a large batch without throwing', () => {
    const records = Array.from({ length: 10_000 }, () => ({
      status: 'urgent',
      createdAt: daysAgo(10),
    }))
    const result = calculatePriorities(records, NOW)
    expect(result).toHaveLength(10_000)
    expect(result.every((level) => level === 'high')).toBe(true)
  })
})
