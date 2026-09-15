import { CircuitBreaker } from '../src/services/circuit-breaker'
import {
  AbortError,
  CircuitOpenError,
  ConfigError,
} from '../src/services/resilience-errors'
import { CircuitState } from '../src/models/resilience'

// A controllable clock so reset timeouts can be advanced deterministically.
function fakeClock(start = 0) {
  let current = start
  return {
    now: () => current,
    advance: (ms: number) => {
      current += ms
    },
  }
}

const succeed = () => Promise.resolve('ok')
const fail = (message = 'boom') => () => Promise.reject(new Error(message))

describe('CircuitBreaker', () => {
  test('stays closed while under the failure threshold', async () => {
    const breaker = new CircuitBreaker({ failureThreshold: 3 })

    await expect(breaker.execute(fail())).rejects.toThrow('boom')
    await expect(breaker.execute(fail())).rejects.toThrow('boom')

    expect(breaker.getState()).toBe('closed')
  })

  test('opens after reaching the failure threshold', async () => {
    const breaker = new CircuitBreaker({ failureThreshold: 3 })

    for (let i = 0; i < 3; i++) {
      await expect(breaker.execute(fail())).rejects.toThrow('boom')
    }

    expect(breaker.getState()).toBe('open')
  })

  test('rejects with CircuitOpenError while open, without invoking the task', async () => {
    const breaker = new CircuitBreaker({ failureThreshold: 1 })
    await expect(breaker.execute(fail())).rejects.toThrow('boom')
    expect(breaker.getState()).toBe('open')

    const task = jest.fn(succeed)
    await expect(breaker.execute(task)).rejects.toBeInstanceOf(CircuitOpenError)
    expect(task).not.toHaveBeenCalled()
  })

  test('a success clears a partial failure streak', async () => {
    const breaker = new CircuitBreaker({ failureThreshold: 3 })
    await expect(breaker.execute(fail())).rejects.toThrow('boom')
    await expect(breaker.execute(fail())).rejects.toThrow('boom')

    await expect(breaker.execute(succeed)).resolves.toBe('ok')

    // Streak reset: two more failures should not trip it yet.
    await expect(breaker.execute(fail())).rejects.toThrow('boom')
    await expect(breaker.execute(fail())).rejects.toThrow('boom')
    expect(breaker.getState()).toBe('closed')
  })

  test('transitions to half-open after the reset timeout', async () => {
    const clock = fakeClock()
    const breaker = new CircuitBreaker({
      failureThreshold: 1,
      resetTimeoutMs: 1000,
      now: clock.now,
    })

    await expect(breaker.execute(fail())).rejects.toThrow('boom')
    expect(breaker.getState()).toBe('open')

    clock.advance(999)
    expect(breaker.getState()).toBe('open')

    clock.advance(1)
    expect(breaker.getState()).toBe('half-open')
  })

  test('closes again after enough half-open successes', async () => {
    const clock = fakeClock()
    const breaker = new CircuitBreaker({
      failureThreshold: 1,
      successThreshold: 2,
      resetTimeoutMs: 1000,
      now: clock.now,
    })

    await expect(breaker.execute(fail())).rejects.toThrow('boom')
    clock.advance(1000)
    expect(breaker.getState()).toBe('half-open')

    await expect(breaker.execute(succeed)).resolves.toBe('ok')
    expect(breaker.getState()).toBe('half-open') // needs 2 successes
    await expect(breaker.execute(succeed)).resolves.toBe('ok')
    expect(breaker.getState()).toBe('closed')
  })

  test('reopens immediately on a failed half-open probe', async () => {
    const clock = fakeClock()
    const breaker = new CircuitBreaker({
      failureThreshold: 1,
      successThreshold: 2,
      resetTimeoutMs: 1000,
      now: clock.now,
    })

    await expect(breaker.execute(fail())).rejects.toThrow('boom')
    clock.advance(1000)
    expect(breaker.getState()).toBe('half-open')

    await expect(breaker.execute(fail('still broken'))).rejects.toThrow('still broken')
    expect(breaker.getState()).toBe('open')
  })

  test('fires onStateChange for every transition', async () => {
    const clock = fakeClock()
    const transitions: Array<[CircuitState, CircuitState]> = []
    const breaker = new CircuitBreaker({
      failureThreshold: 1,
      successThreshold: 1,
      resetTimeoutMs: 1000,
      now: clock.now,
      onStateChange: (from, to) => transitions.push([from, to]),
    })

    await expect(breaker.execute(fail())).rejects.toThrow('boom') // closed -> open
    clock.advance(1000)
    breaker.getState() // open -> half-open
    await expect(breaker.execute(succeed)).resolves.toBe('ok') // half-open -> closed

    expect(transitions).toEqual([
      ['closed', 'open'],
      ['open', 'half-open'],
      ['half-open', 'closed'],
    ])
  })

  test('snapshot reflects internal counters and last error', async () => {
    const breaker = new CircuitBreaker({ failureThreshold: 5 })
    await expect(breaker.execute(fail('recorded'))).rejects.toThrow('recorded')

    const snap = breaker.snapshot()
    expect(snap.state).toBe('closed')
    expect(snap.failures).toBe(1)
    expect((snap.lastError as Error).message).toBe('recorded')
  })

  test('reset returns the breaker to a clean closed state', async () => {
    const breaker = new CircuitBreaker({ failureThreshold: 1 })
    await expect(breaker.execute(fail())).rejects.toThrow('boom')
    expect(breaker.getState()).toBe('open')

    breaker.reset()

    expect(breaker.getState()).toBe('closed')
    expect(breaker.snapshot().failures).toBe(0)
  })

  test('admits only one concurrent probe while half-open', async () => {
    const clock = fakeClock()
    const breaker = new CircuitBreaker({
      failureThreshold: 1,
      successThreshold: 2,
      resetTimeoutMs: 1000,
      now: clock.now,
    })

    await expect(breaker.execute(fail())).rejects.toThrow('boom')
    clock.advance(1000)
    expect(breaker.getState()).toBe('half-open')

    // Hold the first probe open so a second overlaps it.
    let release: (value: string) => void = () => {}
    const gate = new Promise<string>((resolve) => {
      release = resolve
    })
    const firstProbe = breaker.execute(() => gate)

    const secondTask = jest.fn(succeed)
    await expect(breaker.execute(secondTask)).rejects.toBeInstanceOf(CircuitOpenError)
    expect(secondTask).not.toHaveBeenCalled()

    release('ok')
    await expect(firstProbe).resolves.toBe('ok')

    // The slot is freed once the probe settles, so a later probe is admitted.
    await expect(breaker.execute(succeed)).resolves.toBe('ok')
    expect(breaker.getState()).toBe('closed')
  })

  test('does not count an AbortError as a failure', async () => {
    const breaker = new CircuitBreaker({ failureThreshold: 1 })

    await expect(
      breaker.execute(() => Promise.reject(new AbortError())),
    ).rejects.toBeInstanceOf(AbortError)

    expect(breaker.getState()).toBe('closed')
    expect(breaker.snapshot().failures).toBe(0)
  })

  test('a throwing onStateChange hook does not prevent the transition', async () => {
    const breaker = new CircuitBreaker({
      failureThreshold: 1,
      onStateChange: () => {
        throw new Error('hook exploded')
      },
    })

    await expect(breaker.execute(fail())).rejects.toThrow('boom')
    expect(breaker.getState()).toBe('open')
  })

  test('rejects invalid configuration at construction', () => {
    expect(() => new CircuitBreaker({ failureThreshold: 0 })).toThrow(ConfigError)
  })
})
