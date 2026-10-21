import { CircuitBreaker } from '@/lib/resilience/circuit-breaker'

/** Mutable clock so cool-down transitions are deterministic. */
function makeClock(start = 0) {
  let t = start
  return {
    now: () => t,
    advance: (ms: number) => {
      t += ms
    },
  }
}

describe('CircuitBreaker', () => {
  test('opens after the failure threshold of consecutive failures', () => {
    const cb = new CircuitBreaker({ failureThreshold: 3, openDurationMs: 1000 })
    expect(cb.currentState).toBe('closed')
    cb.onFailure()
    cb.onFailure()
    expect(cb.currentState).toBe('closed')
    cb.onFailure()
    expect(cb.currentState).toBe('open')
    expect(cb.canRequest()).toBe(false)
  })

  test('a success resets the consecutive-failure streak while closed', () => {
    const cb = new CircuitBreaker({ failureThreshold: 3, openDurationMs: 1000 })
    cb.onFailure()
    cb.onFailure()
    cb.onSuccess()
    cb.onFailure()
    cb.onFailure()
    expect(cb.currentState).toBe('closed')
  })

  test('transitions open → half-open after the cool-down, then closes on success', () => {
    const clock = makeClock()
    const cb = new CircuitBreaker({
      failureThreshold: 1,
      successThreshold: 1,
      openDurationMs: 1000,
      now: clock.now,
    })

    cb.onFailure()
    expect(cb.currentState).toBe('open')
    expect(cb.canRequest()).toBe(false)

    clock.advance(999)
    expect(cb.canRequest()).toBe(false)
    expect(cb.remainingOpenMs()).toBe(1)

    clock.advance(1)
    expect(cb.canRequest()).toBe(true) // transitions to half-open
    expect(cb.currentState).toBe('half-open')

    cb.onSuccess()
    expect(cb.currentState).toBe('closed')
  })

  test('a failure during half-open re-opens the breaker', () => {
    const clock = makeClock()
    const cb = new CircuitBreaker({
      failureThreshold: 1,
      openDurationMs: 1000,
      now: clock.now,
    })

    cb.onFailure()
    clock.advance(1000)
    expect(cb.canRequest()).toBe(true)
    expect(cb.currentState).toBe('half-open')

    cb.onFailure()
    expect(cb.currentState).toBe('open')
    expect(cb.canRequest()).toBe(false)
  })

  test('half-open requires successThreshold successes to close', () => {
    const clock = makeClock()
    const cb = new CircuitBreaker({
      failureThreshold: 1,
      successThreshold: 2,
      openDurationMs: 1000,
      now: clock.now,
    })

    cb.onFailure()
    clock.advance(1000)
    cb.canRequest()
    cb.onSuccess()
    expect(cb.currentState).toBe('half-open')
    cb.onSuccess()
    expect(cb.currentState).toBe('closed')
  })

  test('reset returns the breaker to a clean closed state', () => {
    const cb = new CircuitBreaker({ failureThreshold: 1, openDurationMs: 1000 })
    cb.onFailure()
    expect(cb.currentState).toBe('open')
    cb.reset()
    expect(cb.currentState).toBe('closed')
    expect(cb.canRequest()).toBe(true)
  })

  test('validates options', () => {
    expect(() => new CircuitBreaker({ failureThreshold: 0 })).toThrow(RangeError)
    expect(() => new CircuitBreaker({ successThreshold: 0 })).toThrow(RangeError)
    expect(() => new CircuitBreaker({ openDurationMs: 0 })).toThrow(RangeError)
  })
})
