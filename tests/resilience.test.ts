import { createResilientCaller } from '../src/utils/resilience'
import { CircuitBreaker, CircuitOpenError } from '../src/utils/circuit-breaker'
import { RetryError } from '../src/utils/retry-utils'

const noopSleep = () => Promise.resolve()

describe('createResilientCaller', () => {
  test('passes a successful call straight through', async () => {
    const caller = createResilientCaller()
    const fn = jest.fn().mockResolvedValue('value')

    await expect(caller.call(fn)).resolves.toBe('value')
    expect(fn).toHaveBeenCalledTimes(1)
  })

  test('retries transient failures and counts them toward the breaker', async () => {
    const fn = jest
      .fn()
      .mockRejectedValueOnce(new Error('fail-1'))
      .mockResolvedValue('ok')

    const caller = createResilientCaller({
      retry: { sleep: noopSleep, jitter: false },
      circuitBreaker: { failureThreshold: 5 },
    })

    await expect(caller.call(fn)).resolves.toBe('ok')
    expect(fn).toHaveBeenCalledTimes(2)
    expect(caller.breaker.failures).toBe(0) // reset by the eventual success
  })

  test('stops retrying once the breaker opens mid-retry', async () => {
    const fn = jest.fn().mockRejectedValue(new Error('always fails'))

    const caller = createResilientCaller({
      retry: { sleep: noopSleep, jitter: false, maxAttempts: 5 },
      circuitBreaker: { failureThreshold: 2 },
    })

    // Two attempts trip the breaker; the third short-circuits.
    await expect(caller.call(fn)).rejects.toBeInstanceOf(CircuitOpenError)
    expect(fn).toHaveBeenCalledTimes(2)
    expect(caller.breaker.state).toBe('open')
  })

  test('honors a caller-supplied isRetryable predicate', async () => {
    const fatal = new Error('fatal')
    const fn = jest.fn().mockRejectedValue(fatal)

    const caller = createResilientCaller({
      retry: {
        sleep: noopSleep,
        maxAttempts: 4,
        isRetryable: () => false,
      },
    })

    await expect(caller.call(fn)).rejects.toBe(fatal)
    expect(fn).toHaveBeenCalledTimes(1)
  })

  test('wraps exhausted retries in RetryError when the breaker stays closed', async () => {
    const fn = jest.fn().mockRejectedValue(new Error('transient'))

    const caller = createResilientCaller({
      retry: { sleep: noopSleep, jitter: false, maxAttempts: 3 },
      circuitBreaker: { failureThreshold: 10 }, // never trips during this test
    })

    await expect(caller.call(fn)).rejects.toBeInstanceOf(RetryError)
    expect(fn).toHaveBeenCalledTimes(3)
  })

  test('shares a provided breaker instance across callers', async () => {
    const breaker = new CircuitBreaker({ failureThreshold: 1 })
    const callerA = createResilientCaller({
      retry: { sleep: noopSleep, maxAttempts: 1 },
      circuitBreaker: breaker,
    })
    const callerB = createResilientCaller({
      retry: { sleep: noopSleep, maxAttempts: 1 },
      circuitBreaker: breaker,
    })

    expect(callerA.breaker).toBe(breaker)
    expect(callerB.breaker).toBe(breaker)

    await expect(callerA.call(() => Promise.reject(new Error('x')))).rejects.toBeInstanceOf(
      RetryError
    )
    // A opened the shared breaker, so B fails fast without invoking its op.
    const guarded = jest.fn().mockResolvedValue('ok')
    await expect(callerB.call(guarded)).rejects.toBeInstanceOf(CircuitOpenError)
    expect(guarded).not.toHaveBeenCalled()
  })
})
