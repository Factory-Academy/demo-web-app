import { computeBackoffDelay } from '@/lib/resilience/backoff'

describe('computeBackoffDelay', () => {
  test('grows exponentially with no jitter', () => {
    const opts = { baseDelayMs: 100, maxDelayMs: 10_000, factor: 2, jitter: 'none' as const }
    expect(computeBackoffDelay(0, opts)).toBe(100)
    expect(computeBackoffDelay(1, opts)).toBe(200)
    expect(computeBackoffDelay(2, opts)).toBe(400)
    expect(computeBackoffDelay(3, opts)).toBe(800)
  })

  test('caps at maxDelayMs', () => {
    const opts = { baseDelayMs: 100, maxDelayMs: 500, factor: 2, jitter: 'none' as const }
    expect(computeBackoffDelay(10, opts)).toBe(500)
  })

  test('full jitter stays within [0, capped]', () => {
    const base = { baseDelayMs: 100, maxDelayMs: 10_000, factor: 2, jitter: 'full' as const }
    expect(computeBackoffDelay(2, { ...base, random: () => 0 })).toBe(0)
    expect(computeBackoffDelay(2, { ...base, random: () => 0.5 })).toBe(200)
    expect(computeBackoffDelay(2, { ...base, random: () => 0.999999 })).toBe(400)
  })

  test('equal jitter stays within [capped/2, capped]', () => {
    const base = { baseDelayMs: 100, maxDelayMs: 10_000, factor: 2, jitter: 'equal' as const }
    // capped at attempt 2 = 400 → range [200, 400]
    expect(computeBackoffDelay(2, { ...base, random: () => 0 })).toBe(200)
    expect(computeBackoffDelay(2, { ...base, random: () => 1 })).toBe(400)
  })

  test('rejects negative or non-integer attempts', () => {
    expect(() => computeBackoffDelay(-1)).toThrow(RangeError)
    expect(() => computeBackoffDelay(1.5)).toThrow(RangeError)
  })
})
