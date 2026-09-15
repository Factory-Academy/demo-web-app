import { ResilientExecutor } from '../src/services/resilient-executor'
import { CircuitBreaker } from '../src/services/circuit-breaker'
import {
  AbortError,
  CircuitOpenError,
  RetryExhaustedError,
} from '../src/services/resilience-errors'

const instantSleep = () => Promise.resolve()

describe('ResilientExecutor', () => {
  test('retries transient failures and eventually succeeds', async () => {
    let calls = 0
    const executor = new ResilientExecutor({
      retry: { maxRetries: 3, sleep: instantSleep, jitter: false },
      circuitBreaker: { failureThreshold: 10 },
    })

    const result = await executor.execute(async () => {
      calls++
      if (calls < 3) throw new Error('transient')
      return 'ok'
    })

    expect(result).toBe('ok')
    expect(calls).toBe(3)
  })

  test('each attempt is observed by the breaker', async () => {
    const breaker = new CircuitBreaker({ failureThreshold: 2 })
    const executor = new ResilientExecutor({
      breaker,
      retry: { maxRetries: 5, sleep: instantSleep },
    })

    // The breaker opens on the 2nd failed attempt; the resulting
    // CircuitOpenError is not retried, so the call fails fast.
    await expect(
      executor.execute(async () => {
        throw new Error('always')
      }),
    ).rejects.toBeInstanceOf(CircuitOpenError)

    expect(breaker.getState()).toBe('open')
  })

  test('does not retry once the circuit is open', async () => {
    const breaker = new CircuitBreaker({ failureThreshold: 1 })
    // Pre-trip the breaker.
    await expect(breaker.execute(() => Promise.reject(new Error('x')))).rejects.toThrow('x')
    expect(breaker.getState()).toBe('open')

    const executor = new ResilientExecutor({
      breaker,
      retry: { maxRetries: 5, sleep: instantSleep },
    })

    const task = jest.fn(async () => 'never runs')
    await expect(executor.execute(task)).rejects.toBeInstanceOf(CircuitOpenError)
    expect(task).not.toHaveBeenCalled()
  })

  test('honors a custom shouldRetry while still short-circuiting open errors', async () => {
    const executor = new ResilientExecutor({
      retry: {
        maxRetries: 5,
        sleep: instantSleep,
        shouldRetry: () => false,
      },
      circuitBreaker: { failureThreshold: 10 },
    })

    const fatal = new Error('non-retryable')
    const task = jest.fn(async () => {
      throw fatal
    })

    await expect(executor.execute(task)).rejects.toBe(fatal)
    expect(task).toHaveBeenCalledTimes(1)
  })

  test('exhausts retries when failures stay under the breaker threshold', async () => {
    const executor = new ResilientExecutor({
      retry: { maxRetries: 2, sleep: instantSleep },
      circuitBreaker: { failureThreshold: 100 },
    })

    await expect(
      executor.execute(async () => {
        throw new Error('flaky')
      }),
    ).rejects.toBeInstanceOf(RetryExhaustedError)
  })

  test('a timeout counts as a breaker failure', async () => {
    const breaker = new CircuitBreaker({ failureThreshold: 1 })
    const executor = new ResilientExecutor({
      breaker,
      retry: { maxRetries: 0, timeoutMs: 10, sleep: instantSleep },
    })

    await expect(
      executor.execute(
        () => new Promise((resolve) => setTimeout(() => resolve('slow'), 50)),
      ),
    ).rejects.toBeDefined()

    expect(breaker.getState()).toBe('open')
  })

  test('exposes breaker state and snapshot', async () => {
    const executor = new ResilientExecutor({
      retry: { maxRetries: 0, sleep: instantSleep },
      circuitBreaker: { failureThreshold: 5 },
    })

    expect(executor.getState()).toBe('closed')
    expect(executor.snapshot().state).toBe('closed')
  })

  test('propagates a caller abort without tripping the breaker', async () => {
    const breaker = new CircuitBreaker({ failureThreshold: 1 })
    const executor = new ResilientExecutor({
      breaker,
      retry: { maxRetries: 3, sleep: instantSleep },
    })

    const controller = new AbortController()
    const task = (signal: AbortSignal) =>
      new Promise<string>((_resolve, reject) => {
        signal.addEventListener('abort', () => reject(new Error('fetch aborted')))
      })

    const promise = executor.execute(task, { signal: controller.signal })
    controller.abort()

    await expect(promise).rejects.toBeInstanceOf(AbortError)
    // Cancellation is not a dependency failure, so the breaker stays closed.
    expect(breaker.getState()).toBe('closed')
  })
})
