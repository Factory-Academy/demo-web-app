import { ResilientExecutor } from '@/lib/resilience/resilient'
import { CircuitBreaker } from '@/lib/resilience/circuit-breaker'
import { CircuitOpenError } from '@/lib/resilience/errors'

const instantSleep = () => Promise.resolve()
const noJitter = { baseDelayMs: 1, maxDelayMs: 10, factor: 2, jitter: 'none' as const }

function makeClock(start = 0) {
  let t = start
  return { now: () => t, advance: (ms: number) => (t += ms) }
}

describe('ResilientExecutor', () => {
  test('retries transient failures then succeeds, recording success on the breaker', async () => {
    const clock = makeClock()
    const breaker = new CircuitBreaker({
      failureThreshold: 5,
      openDurationMs: 1000,
      now: clock.now,
    })
    const executor = new ResilientExecutor({
      circuitBreaker: breaker,
      retry: { retries: 3, backoff: noJitter },
      sleep: instantSleep,
    })

    const op = jest
      .fn()
      .mockRejectedValueOnce(new Error('transient'))
      .mockResolvedValue('ok')

    await expect(executor.execute(op)).resolves.toBe('ok')
    expect(op).toHaveBeenCalledTimes(2)
    expect(breaker.currentState).toBe('closed')
  })

  test('opens the breaker once failures cross the threshold and then fails fast', async () => {
    const clock = makeClock()
    const breaker = new CircuitBreaker({
      failureThreshold: 3,
      openDurationMs: 1000,
      now: clock.now,
    })
    const executor = new ResilientExecutor({
      circuitBreaker: breaker,
      // Allow enough retries that a single execute() can trip a 3-failure breaker.
      retry: { retries: 5, backoff: noJitter, shouldRetry: () => true },
      sleep: instantSleep,
    })

    const op = jest.fn().mockRejectedValue(new Error('down'))

    await executor.execute(op).catch((e) => e)
    // 3 failed attempts trip the breaker, aborting the remaining retries.
    expect(op).toHaveBeenCalledTimes(3)
    expect(breaker.currentState).toBe('open')

    // The next call short-circuits before invoking the operation.
    const second = await executor.execute(op).catch((e) => e)
    expect(second).toBeInstanceOf(CircuitOpenError)
    expect(op).toHaveBeenCalledTimes(3)
  })

  test('recovers through half-open after the cool-down', async () => {
    const clock = makeClock()
    const breaker = new CircuitBreaker({
      failureThreshold: 1,
      successThreshold: 1,
      openDurationMs: 1000,
      now: clock.now,
    })
    const executor = new ResilientExecutor({
      circuitBreaker: breaker,
      retry: { retries: 0, backoff: noJitter },
      sleep: instantSleep,
    })

    await executor.execute(() => Promise.reject(new Error('fail'))).catch((e) => e)
    expect(breaker.currentState).toBe('open')

    clock.advance(1000)
    await expect(executor.execute(() => Promise.resolve('back'))).resolves.toBe('back')
    expect(breaker.currentState).toBe('closed')
  })

  test('respects a custom shouldRetry predicate', async () => {
    const executor = new ResilientExecutor({
      retry: {
        retries: 5,
        backoff: noJitter,
        shouldRetry: (error) => (error as Error).message === 'retry-me',
      },
      sleep: instantSleep,
    })

    const op = jest.fn().mockRejectedValue(new Error('do-not-retry'))
    const error = await executor.execute(op).catch((e) => e)
    expect(error).toBeInstanceOf(Error)
    expect(op).toHaveBeenCalledTimes(1)
  })
})
