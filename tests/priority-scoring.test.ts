import {
  MILLIS_PER_DAY,
  ageInDays,
  scoreToLevel,
} from '../src/services/priority-scoring'

describe('ageInDays', () => {
  const now = new Date('2026-09-15T00:00:00.000Z')

  test('returns whole days elapsed for a past date', () => {
    const tenDaysAgo = new Date(now.getTime() - 10 * MILLIS_PER_DAY)
    expect(ageInDays(tenDaysAgo, now)).toBe(10)
  })

  test('floors partial days', () => {
    const almostTwoDays = new Date(now.getTime() - (2 * MILLIS_PER_DAY - 1))
    expect(ageInDays(almostTwoDays, now)).toBe(1)
  })

  test('accepts ISO strings', () => {
    const created = new Date(now.getTime() - 3 * MILLIS_PER_DAY).toISOString()
    expect(ageInDays(created, now)).toBe(3)
  })

  test('accepts epoch millis numbers', () => {
    const created = now.getTime() - 4 * MILLIS_PER_DAY
    expect(ageInDays(created, now)).toBe(4)
  })

  test('clamps future dates to 0', () => {
    const future = new Date(now.getTime() + 5 * MILLIS_PER_DAY)
    expect(ageInDays(future, now)).toBe(0)
  })

  test('returns 0 for the exact reference time', () => {
    expect(ageInDays(now, now)).toBe(0)
  })

  test('returns 0 for undefined createdAt', () => {
    expect(ageInDays(undefined, now)).toBe(0)
  })

  test('returns 0 for an unparseable date string', () => {
    expect(ageInDays('not-a-date', now)).toBe(0)
  })
})

describe('scoreToLevel', () => {
  test('maps scores at the exact thresholds', () => {
    expect(scoreToLevel(80)).toBe('critical')
    expect(scoreToLevel(50)).toBe('high')
    expect(scoreToLevel(20)).toBe('medium')
    expect(scoreToLevel(0)).toBe('low')
  })

  test('maps scores just below a threshold to the lower level', () => {
    expect(scoreToLevel(79.9)).toBe('high')
    expect(scoreToLevel(49.9)).toBe('medium')
    expect(scoreToLevel(19.9)).toBe('low')
  })

  test('maps very high scores to critical', () => {
    expect(scoreToLevel(1000)).toBe('critical')
  })

  test('treats negative scores as low', () => {
    expect(scoreToLevel(-50)).toBe('low')
  })

  test('treats NaN as low', () => {
    expect(scoreToLevel(NaN)).toBe('low')
  })
})
