import { KeyedRateLimiter } from '../../src/lib/rate-limiter/keyed-rate-limiter'

function fakeClock(start = 0) {
  let current = start
  return {
    now: () => current,
    advance: (ms: number) => {
      current += ms
    },
  }
}

describe('KeyedRateLimiter', () => {
  test('tracks independent buckets per key', () => {
    const limiter = new KeyedRateLimiter({ capacity: 1, refillTokens: 1, refillIntervalMs: 1000 })

    expect(limiter.check('a').allowed).toBe(true)
    expect(limiter.check('a').allowed).toBe(false)
    // A different key has its own budget.
    expect(limiter.check('b').allowed).toBe(true)
  })

  test('shares a bucket across calls with the same key', () => {
    const clock = fakeClock()
    const limiter = new KeyedRateLimiter({
      capacity: 2,
      refillTokens: 1,
      refillIntervalMs: 1000,
      now: clock.now,
    })

    expect(limiter.check('a').allowed).toBe(true)
    expect(limiter.check('a').allowed).toBe(true)
    expect(limiter.check('a').allowed).toBe(false)

    clock.advance(1000)
    expect(limiter.check('a').allowed).toBe(true)
  })

  test('validates maxIdleMs', () => {
    expect(
      () => new KeyedRateLimiter({ capacity: 1, refillTokens: 1, refillIntervalMs: 1000, maxIdleMs: 0 }),
    ).toThrow(RangeError)
  })

  test('validates maxKeys', () => {
    expect(
      () => new KeyedRateLimiter({ capacity: 1, refillTokens: 1, refillIntervalMs: 1000, maxKeys: 1.5 }),
    ).toThrow(RangeError)
  })

  describe('idle eviction', () => {
    test('prunes buckets idle longer than maxIdleMs', () => {
      const clock = fakeClock()
      const limiter = new KeyedRateLimiter({
        capacity: 1,
        refillTokens: 1,
        refillIntervalMs: 1000,
        maxIdleMs: 5000,
        now: clock.now,
      })

      limiter.check('a')
      expect(limiter.size()).toBe(1)

      clock.advance(5000)
      expect(limiter.prune()).toBe(1)
      expect(limiter.size()).toBe(0)
    })

    test('an evicted key gets a fresh full bucket', () => {
      const clock = fakeClock()
      const limiter = new KeyedRateLimiter({
        capacity: 1,
        refillTokens: 1,
        refillIntervalMs: 1000,
        maxIdleMs: 5000,
        now: clock.now,
      })

      expect(limiter.check('a').allowed).toBe(true)
      expect(limiter.check('a').allowed).toBe(false)

      clock.advance(6000)
      // Idle bucket evicted, so the key starts full again.
      expect(limiter.check('a').allowed).toBe(true)
    })

    test('recent activity keeps a bucket alive', () => {
      const clock = fakeClock()
      const limiter = new KeyedRateLimiter({
        capacity: 3,
        refillTokens: 1,
        refillIntervalMs: 1000,
        maxIdleMs: 5000,
        now: clock.now,
      })

      limiter.check('a')
      clock.advance(3000)
      limiter.check('a')
      clock.advance(3000)
      // 6s total elapsed, but last activity was 3s ago (< 5s idle window).
      expect(limiter.size()).toBe(1)
    })
  })

  describe('LRU capacity', () => {
    test('evicts the least-recently-used key when full', () => {
      const limiter = new KeyedRateLimiter({
        capacity: 1,
        refillTokens: 1,
        refillIntervalMs: 1000,
        maxKeys: 2,
      })

      limiter.check('a')
      limiter.check('b')
      limiter.check('c') // should evict 'a'

      expect(limiter.size()).toBe(2)
      // 'a' was evicted, so it starts fresh (allowed again).
      expect(limiter.check('a').allowed).toBe(true)
    })

    test('touching a key refreshes its LRU position', () => {
      const clock = fakeClock()
      const limiter = new KeyedRateLimiter({
        capacity: 1,
        refillTokens: 1,
        refillIntervalMs: 1000,
        maxKeys: 2,
        now: clock.now,
      })

      limiter.check('a')
      limiter.check('b')
      limiter.check('a') // refresh 'a' so 'b' is now the LRU
      limiter.check('c') // evicts 'b'

      // 'a' preserved: its single token was already spent.
      expect(limiter.check('a').allowed).toBe(false)
    })
  })

  describe('reset', () => {
    test('clears a single key', () => {
      const limiter = new KeyedRateLimiter({ capacity: 1, refillTokens: 1, refillIntervalMs: 1000 })
      limiter.check('a')
      expect(limiter.check('a').allowed).toBe(false)
      limiter.reset('a')
      expect(limiter.check('a').allowed).toBe(true)
    })

    test('clears all keys', () => {
      const limiter = new KeyedRateLimiter({ capacity: 1, refillTokens: 1, refillIntervalMs: 1000 })
      limiter.check('a')
      limiter.check('b')
      limiter.reset()
      expect(limiter.size()).toBe(0)
    })
  })
})
