import {
  CircuitBreaker,
  CircuitOpenError,
} from '../src/utils/circuit-breaker'

// A controllable clock so cool-down windows can be advanced without waiting.
function fakeClock(start = 0) {
  let value = start
  return {
    now: () => value,
    advance: (ms: number) => {
      value += ms
    },
  }
}

const ok = () => Promise.resolve('ok')
const fail = (message = 'boom') => () => Promise.reject(new Error(message))

describe('CircuitBreaker', () => {
  test('starts closed and passes calls through', async () => {
    const breaker = new CircuitBreaker()
    await expect(breaker.execute(ok)).resolves.toBe('ok')
    expect(breaker.state).toBe('closed')
  })

  test('opens after reaching the failure threshold', async () => {
    const breaker = new CircuitBreaker({ failureThreshold: 3 })

    for (let i = 0; i < 3; i++) {
      await expect(breaker.execute(fail())).rejects.toThrow('boom')
    }

    expect(breaker.state).toBe('open')
  })

  test('fails fast with CircuitOpenError while open', async () => {
    const clock = fakeClock()
    const breaker = new CircuitBreaker({
      failureThreshold: 1,
      resetTimeoutMs: 1000,
      now: clock.now,
    })

    await expect(breaker.execute(fail())).rejects.toThrow('boom')
    expect(breaker.state).toBe('open')

    const guarded = jest.fn(ok)
    await expect(breaker.execute(guarded)).rejects.toBeInstanceOf(CircuitOpenError)
    expect(guarded).not.toHaveBeenCalled()
  })

  test('resets the failure count after a success while closed', async () => {
    const breaker = new CircuitBreaker({ failureThreshold: 3 })

    await expect(breaker.execute(fail())).rejects.toThrow()
    await expect(breaker.execute(fail())).rejects.toThrow()
    expect(breaker.failures).toBe(2)

    await expect(breaker.execute(ok)).resolves.toBe('ok')
    expect(breaker.failures).toBe(0)
    expect(breaker.state).toBe('closed')
  })

  test('moves to half-open after the cool-down elapses', async () => {
    const clock = fakeClock()
    const breaker = new CircuitBreaker({
      failureThreshold: 1,
      resetTimeoutMs: 1000,
      now: clock.now,
    })

    await expect(breaker.execute(fail())).rejects.toThrow()
    expect(breaker.state).toBe('open')

    clock.advance(1000)
    expect(breaker.state).toBe('half-open')
  })

  test('closes again after a successful half-open probe', async () => {
    const clock = fakeClock()
    const breaker = new CircuitBreaker({
      failureThreshold: 1,
      successThreshold: 1,
      resetTimeoutMs: 1000,
      now: clock.now,
    })

    await expect(breaker.execute(fail())).rejects.toThrow()
    clock.advance(1000)

    await expect(breaker.execute(ok)).resolves.toBe('ok')
    expect(breaker.state).toBe('closed')
  })

  test('requires successThreshold probes before closing', async () => {
    const clock = fakeClock()
    const breaker = new CircuitBreaker({
      failureThreshold: 1,
      successThreshold: 2,
      resetTimeoutMs: 1000,
      now: clock.now,
    })

    await expect(breaker.execute(fail())).rejects.toThrow()
    clock.advance(1000)

    await expect(breaker.execute(ok)).resolves.toBe('ok')
    expect(breaker.state).toBe('half-open')

    await expect(breaker.execute(ok)).resolves.toBe('ok')
    expect(breaker.state).toBe('closed')
  })

  test('re-opens when a half-open probe fails', async () => {
    const clock = fakeClock()
    const breaker = new CircuitBreaker({
      failureThreshold: 1,
      resetTimeoutMs: 1000,
      now: clock.now,
    })

    await expect(breaker.execute(fail())).rejects.toThrow()
    clock.advance(1000)
    expect(breaker.state).toBe('half-open')

    await expect(breaker.execute(fail('probe failed'))).rejects.toThrow('probe failed')
    expect(breaker.state).toBe('open')

    // Cool-down restarts from the failed probe.
    const guarded = jest.fn(ok)
    await expect(breaker.execute(guarded)).rejects.toBeInstanceOf(CircuitOpenError)
    expect(guarded).not.toHaveBeenCalled()
  })

  test('only allows a single concurrent half-open probe', async () => {
    const clock = fakeClock()
    const breaker = new CircuitBreaker({
      failureThreshold: 1,
      resetTimeoutMs: 1000,
      now: clock.now,
    })

    await expect(breaker.execute(fail())).rejects.toThrow()
    clock.advance(1000)

    let release!: () => void
    const pending = new Promise<string>((resolve) => {
      release = () => resolve('probe-done')
    })

    const probe = breaker.execute(() => pending)
    // A second call while the probe is in flight must fail fast.
    await expect(breaker.execute(ok)).rejects.toBeInstanceOf(CircuitOpenError)

    release()
    await expect(probe).resolves.toBe('probe-done')
    expect(breaker.state).toBe('closed')
  })

  test('ignores errors excluded by isFailure', async () => {
    const breaker = new CircuitBreaker({
      failureThreshold: 1,
      isFailure: (error) => (error as Error).message !== 'ignore me',
    })

    await expect(breaker.execute(fail('ignore me'))).rejects.toThrow('ignore me')
    expect(breaker.state).toBe('closed')
    expect(breaker.failures).toBe(0)
  })

  test('reports state transitions through onStateChange', async () => {
    const clock = fakeClock()
    const transitions: string[] = []
    const breaker = new CircuitBreaker({
      failureThreshold: 1,
      resetTimeoutMs: 1000,
      now: clock.now,
      onStateChange: (from, to) => transitions.push(`${from}->${to}`),
    })

    await expect(breaker.execute(fail())).rejects.toThrow()
    clock.advance(1000)
    await expect(breaker.execute(ok)).resolves.toBe('ok')

    expect(transitions).toEqual(['closed->open', 'open->half-open', 'half-open->closed'])
  })

  test('reset returns the breaker to a clean closed state', async () => {
    const breaker = new CircuitBreaker({ failureThreshold: 1 })
    await expect(breaker.execute(fail())).rejects.toThrow()
    expect(breaker.state).toBe('open')

    breaker.reset()
    expect(breaker.state).toBe('closed')
    expect(breaker.failures).toBe(0)
    await expect(breaker.execute(ok)).resolves.toBe('ok')
  })

  test('rejects invalid configuration', () => {
    expect(() => new CircuitBreaker({ failureThreshold: 0 })).toThrow(RangeError)
    expect(() => new CircuitBreaker({ resetTimeoutMs: -1 })).toThrow(RangeError)
  })
})
