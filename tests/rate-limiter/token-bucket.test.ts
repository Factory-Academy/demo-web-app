import { TokenBucket } from '../../src/lib/rate-limiter/token-bucket'

function fakeClock(start = 0) {
  let current = start
  return {
    now: () => current,
    advance: (ms: number) => {
      current += ms
    },
    set: (ms: number) => {
      current = ms
    },
  }
}

describe('TokenBucket', () => {
  describe('construction', () => {
    test('rejects non-positive capacity', () => {
      expect(() => new TokenBucket({ capacity: 0, refillTokens: 1, refillIntervalMs: 1000 })).toThrow(
        RangeError,
      )
    })

    test('rejects non-positive refillTokens', () => {
      expect(() => new TokenBucket({ capacity: 5, refillTokens: 0, refillIntervalMs: 1000 })).toThrow(
        RangeError,
      )
    })

    test('rejects non-positive refillIntervalMs', () => {
      expect(() => new TokenBucket({ capacity: 5, refillTokens: 1, refillIntervalMs: 0 })).toThrow(
        RangeError,
      )
    })

    test('rejects negative initialTokens', () => {
      expect(
        () => new TokenBucket({ capacity: 5, refillTokens: 1, refillIntervalMs: 1000, initialTokens: -1 }),
      ).toThrow(RangeError)
    })

    test('rejects non-finite capacity', () => {
      expect(
        () => new TokenBucket({ capacity: Infinity, refillTokens: 1, refillIntervalMs: 1000 }),
      ).toThrow(RangeError)
    })

    test('starts full by default', () => {
      const bucket = new TokenBucket({ capacity: 5, refillTokens: 1, refillIntervalMs: 1000 })
      expect(bucket.peek()).toBe(5)
    })

    test('honors initialTokens', () => {
      const bucket = new TokenBucket({
        capacity: 5,
        refillTokens: 1,
        refillIntervalMs: 1000,
        initialTokens: 2,
      })
      expect(bucket.peek()).toBe(2)
    })

    test('clamps initialTokens to capacity', () => {
      const bucket = new TokenBucket({
        capacity: 5,
        refillTokens: 1,
        refillIntervalMs: 1000,
        initialTokens: 99,
      })
      expect(bucket.peek()).toBe(5)
    })
  })

  describe('consumption', () => {
    test('allows requests while tokens remain', () => {
      const clock = fakeClock()
      const bucket = new TokenBucket({ capacity: 3, refillTokens: 1, refillIntervalMs: 1000, now: clock.now })

      expect(bucket.tryConsume().allowed).toBe(true)
      expect(bucket.tryConsume().allowed).toBe(true)
      expect(bucket.tryConsume().allowed).toBe(true)

      const blocked = bucket.tryConsume()
      expect(blocked.allowed).toBe(false)
      expect(blocked.remaining).toBe(0)
    })

    test('supports multi-token consumption', () => {
      const clock = fakeClock()
      const bucket = new TokenBucket({ capacity: 10, refillTokens: 1, refillIntervalMs: 1000, now: clock.now })

      const result = bucket.tryConsume(4)
      expect(result.allowed).toBe(true)
      expect(result.remaining).toBe(6)
    })

    test('rejects requests larger than capacity with infinite retry', () => {
      const bucket = new TokenBucket({ capacity: 5, refillTokens: 1, refillIntervalMs: 1000 })
      const result = bucket.tryConsume(6)
      expect(result.allowed).toBe(false)
      expect(result.retryAfterMs).toBe(Infinity)
    })

    test('rejects non-positive token counts', () => {
      const bucket = new TokenBucket({ capacity: 5, refillTokens: 1, refillIntervalMs: 1000 })
      expect(() => bucket.tryConsume(0)).toThrow(RangeError)
      expect(() => bucket.tryConsume(-2)).toThrow(RangeError)
    })

    test('reports retryAfterMs when blocked', () => {
      const clock = fakeClock()
      const bucket = new TokenBucket({ capacity: 2, refillTokens: 1, refillIntervalMs: 1000, now: clock.now })

      bucket.tryConsume(2)
      const blocked = bucket.tryConsume(1)
      expect(blocked.allowed).toBe(false)
      // Need 1 token, refills at 1 per 1000ms.
      expect(blocked.retryAfterMs).toBe(1000)
    })
  })

  describe('refill', () => {
    test('refills continuously over time', () => {
      const clock = fakeClock()
      const bucket = new TokenBucket({ capacity: 10, refillTokens: 2, refillIntervalMs: 1000, now: clock.now })

      bucket.tryConsume(10)
      expect(bucket.peek()).toBe(0)

      clock.advance(500)
      expect(bucket.peek()).toBe(1)

      clock.advance(500)
      expect(bucket.peek()).toBe(2)
    })

    test('never exceeds capacity even after long idle', () => {
      const clock = fakeClock()
      const bucket = new TokenBucket({ capacity: 5, refillTokens: 1, refillIntervalMs: 1000, now: clock.now })

      bucket.tryConsume(5)
      clock.advance(1_000_000)
      expect(bucket.peek()).toBe(5)
    })

    test('accumulates fractional tokens across calls', () => {
      const clock = fakeClock()
      const bucket = new TokenBucket({ capacity: 10, refillTokens: 1, refillIntervalMs: 1000, now: clock.now })

      bucket.tryConsume(10)
      clock.advance(400)
      expect(bucket.peek()).toBe(0) // 0.4 tokens, floored
      clock.advance(400)
      expect(bucket.peek()).toBe(0) // 0.8 tokens, floored
      clock.advance(400)
      expect(bucket.peek()).toBe(1) // 1.2 tokens, floored
    })

    test('a blocked request succeeds after enough time passes', () => {
      const clock = fakeClock()
      const bucket = new TokenBucket({ capacity: 1, refillTokens: 1, refillIntervalMs: 1000, now: clock.now })

      expect(bucket.tryConsume().allowed).toBe(true)
      expect(bucket.tryConsume().allowed).toBe(false)

      clock.advance(1000)
      expect(bucket.tryConsume().allowed).toBe(true)
    })
  })

  describe('clock safety', () => {
    test('does not grant tokens when the clock moves backwards', () => {
      const clock = fakeClock(10_000)
      const bucket = new TokenBucket({ capacity: 5, refillTokens: 1, refillIntervalMs: 1000, now: clock.now })

      bucket.tryConsume(5)
      clock.set(5_000) // clock jumps backwards
      expect(bucket.peek()).toBe(0)

      // Forward progress from the new (earlier) reference still works.
      clock.advance(2000)
      expect(bucket.peek()).toBe(2)
    })
  })

  describe('reset', () => {
    test('restores the bucket to full capacity', () => {
      const clock = fakeClock()
      const bucket = new TokenBucket({ capacity: 5, refillTokens: 1, refillIntervalMs: 1000, now: clock.now })

      bucket.tryConsume(5)
      expect(bucket.peek()).toBe(0)
      bucket.reset()
      expect(bucket.peek()).toBe(5)
    })
  })

  describe('result metadata', () => {
    test('resetMs shrinks as the bucket refills', () => {
      const clock = fakeClock()
      const bucket = new TokenBucket({ capacity: 4, refillTokens: 1, refillIntervalMs: 1000, now: clock.now })

      bucket.tryConsume(4) // empty: 4 missing => 4000ms to full
      clock.advance(2000) // 2 tokens refilled
      const result = bucket.tryConsume(0.5) // leaves 1.5 tokens => 2.5 missing
      expect(result.resetMs).toBe(2500)
    })

    test('resetMs reflects time to refill to capacity', () => {
      const clock = fakeClock()
      const bucket = new TokenBucket({ capacity: 4, refillTokens: 1, refillIntervalMs: 1000, now: clock.now })

      const result = bucket.tryConsume(4)
      expect(result.remaining).toBe(0)
      // 4 missing tokens at 1/1000ms => 4000ms to full.
      expect(result.resetMs).toBe(4000)
    })

    test('echoes the requested amount', () => {
      const bucket = new TokenBucket({ capacity: 5, refillTokens: 1, refillIntervalMs: 1000 })
      expect(bucket.tryConsume(3).requested).toBe(3)
    })
  })
})
