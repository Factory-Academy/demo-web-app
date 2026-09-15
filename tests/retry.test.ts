import {
  computeBackoffDelay,
  retryWithBackoff,
  withTimeout,
  DEFAULT_RETRY_OPTIONS,
} from '../src/services/retry'
import {
  AbortError,
  ConfigError,
  RetryExhaustedError,
  TimeoutError,
} from '../src/services/resilience-errors'
import { RetryOptions } from '../src/models/resilience'

// A sleep that resolves instantly so tests never wait on real timers.
const instantSleep = () => Promise.resolve()

// A real-timer sleep, used only where a test needs to abort mid-backoff.
const realSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

describe('computeBackoffDelay', () => {
  const base: RetryOptions = {
    ...DEFAULT_RETRY_OPTIONS,
    initialDelayMs: 100,
    backoffFactor: 2,
    maxDelayMs: 2000,
    jitter: false,
  }

  test('grows geometrically without jitter', () => {
    expect(computeBackoffDelay(1, base)).toBe(100)
    expect(computeBackoffDelay(2, base)).toBe(200)
    expect(computeBackoffDelay(3, base)).toBe(400)
    expect(computeBackoffDelay(4, base)).toBe(800)
  })

  test('caps at maxDelayMs', () => {
    expect(computeBackoffDelay(10, base)).toBe(2000)
  })

  test('applies full jitter within [0, capped]', () => {
    const jittered: RetryOptions = { ...base, jitter: true }
    // random = 0.5 -> half of the capped delay (200 at attempt 2).
    expect(computeBackoffDelay(2, jittered, () => 0.5)).toBe(100)
    expect(computeBackoffDelay(2, jittered, () => 0)).toBe(0)
    expect(computeBackoffDelay(2, jittered, () => 0.999)).toBeLessThanOrEqual(200)
  })
})

describe('withTimeout', () => {
  test('resolves when the task finishes in time', async () => {
    const result = await withTimeout(async () => 'ok', { timeoutMs: 1000 })
    expect(result).toBe('ok')
  })

  test('rejects with TimeoutError when the task is too slow', async () => {
    const slow = () => new Promise<string>((resolve) => setTimeout(() => resolve('late'), 50))
    await expect(withTimeout(slow, { timeoutMs: 10 })).rejects.toBeInstanceOf(TimeoutError)
  })

  test('aborts the signal when the timeout fires', async () => {
    let aborted = false
    const task = (signal: AbortSignal) =>
      new Promise<string>((_resolve, reject) => {
        signal.addEventListener('abort', () => {
          aborted = true
          reject(new Error('aborted'))
        })
      })

    await expect(withTimeout(task, { timeoutMs: 10 })).rejects.toBeInstanceOf(TimeoutError)
    expect(aborted).toBe(true)
  })

  test('runs without a timer when timeoutMs <= 0', async () => {
    const result = await withTimeout(async (signal) => signal.aborted, { timeoutMs: 0 })
    expect(result).toBe(false)
  })

  test('rejects with AbortError when the signal is already aborted', async () => {
    const controller = new AbortController()
    controller.abort()
    const task = jest.fn(async () => 'nope')

    await expect(
      withTimeout(task, { timeoutMs: 1000, signal: controller.signal }),
    ).rejects.toBeInstanceOf(AbortError)
    expect(task).not.toHaveBeenCalled()
  })

  test('surfaces a mid-flight abort as AbortError, not the task error', async () => {
    const controller = new AbortController()
    const task = (signal: AbortSignal) =>
      new Promise<string>((_resolve, reject) => {
        signal.addEventListener('abort', () => reject(new Error('inner rejection')))
      })

    const promise = withTimeout(task, { timeoutMs: 0, signal: controller.signal })
    controller.abort()

    await expect(promise).rejects.toBeInstanceOf(AbortError)
  })

  test('a timeout still wins over a provided (unaborted) signal', async () => {
    const controller = new AbortController()
    const slow = () => new Promise<string>((resolve) => setTimeout(() => resolve('late'), 50))
    await expect(
      withTimeout(slow, { timeoutMs: 10, signal: controller.signal }),
    ).rejects.toBeInstanceOf(TimeoutError)
  })

  test('clears the timer after the task resolves', async () => {
    const clearTimeoutFn = jest.fn()
    const setTimeoutFn = jest.fn(() => 123 as unknown as ReturnType<typeof setTimeout>)
    await withTimeout(async () => 'done', {
      timeoutMs: 1000,
      setTimeoutFn: setTimeoutFn as unknown as typeof setTimeout,
      clearTimeoutFn: clearTimeoutFn as unknown as typeof clearTimeout,
    })
    expect(clearTimeoutFn).toHaveBeenCalledWith(123)
  })
})

describe('retryWithBackoff', () => {
  test('returns immediately on first success', async () => {
    const task = jest.fn(async () => 'value')
    const result = await retryWithBackoff(task, { sleep: instantSleep })
    expect(result).toBe('value')
    expect(task).toHaveBeenCalledTimes(1)
  })

  test('retries transient failures then succeeds', async () => {
    let calls = 0
    const task = jest.fn(async () => {
      calls++
      if (calls < 3) throw new Error('transient')
      return 'recovered'
    })

    const onRetry = jest.fn()
    const result = await retryWithBackoff(task, {
      maxRetries: 3,
      sleep: instantSleep,
      jitter: false,
      onRetry,
    })

    expect(result).toBe('recovered')
    expect(task).toHaveBeenCalledTimes(3)
    expect(onRetry).toHaveBeenCalledTimes(2)
  })

  test('wraps the final error in RetryExhaustedError', async () => {
    const boom = new Error('always fails')
    const task = jest.fn(async () => {
      throw boom
    })

    await expect(
      retryWithBackoff(task, { maxRetries: 2, sleep: instantSleep }),
    ).rejects.toBeInstanceOf(RetryExhaustedError)

    // maxRetries=2 -> 3 total attempts.
    expect(task).toHaveBeenCalledTimes(3)
  })

  test('preserves the underlying cause on RetryExhaustedError', async () => {
    const boom = new Error('root cause')
    const task = async () => {
      throw boom
    }

    await expect(
      retryWithBackoff(task, { maxRetries: 1, sleep: instantSleep }),
    ).rejects.toMatchObject({ cause: boom, retries: 1 })
  })

  test('does not retry non-retryable errors and rethrows them unwrapped', async () => {
    const fatal = new Error('do not retry')
    const task = jest.fn(async () => {
      throw fatal
    })

    await expect(
      retryWithBackoff(task, {
        maxRetries: 5,
        sleep: instantSleep,
        shouldRetry: () => false,
      }),
    ).rejects.toBe(fatal)

    expect(task).toHaveBeenCalledTimes(1)
  })

  test('reports increasing attempt numbers to shouldRetry', async () => {
    const attempts: number[] = []
    const task = async () => {
      throw new Error('fail')
    }

    await expect(
      retryWithBackoff(task, {
        maxRetries: 2,
        sleep: instantSleep,
        shouldRetry: (_error, attempt) => {
          attempts.push(attempt)
          return true
        },
      }),
    ).rejects.toBeInstanceOf(RetryExhaustedError)

    expect(attempts).toEqual([1, 2, 3])
  })

  test('surfaces a timeout as a retryable failure', async () => {
    let calls = 0
    const task = jest.fn(async () => {
      calls++
      if (calls === 1) {
        // First attempt hangs long enough to time out.
        return new Promise<string>((resolve) => setTimeout(() => resolve('slow'), 50))
      }
      return 'fast'
    })

    const result = await retryWithBackoff(task, {
      maxRetries: 2,
      timeoutMs: 10,
      sleep: instantSleep,
    })

    expect(result).toBe('fast')
    expect(task).toHaveBeenCalledTimes(2)
  })

  test('throws ConfigError on invalid options instead of running the task', async () => {
    const task = jest.fn(async () => 'value')
    await expect(
      retryWithBackoff(task, { maxRetries: -3 }),
    ).rejects.toBeInstanceOf(ConfigError)
    expect(task).not.toHaveBeenCalled()
  })

  test('a throwing onRetry hook does not break the retry loop', async () => {
    let calls = 0
    const task = jest.fn(async () => {
      calls++
      if (calls < 2) throw new Error('transient')
      return 'ok'
    })

    const result = await retryWithBackoff(task, {
      maxRetries: 2,
      sleep: instantSleep,
      jitter: false,
      onRetry: () => {
        throw new Error('hook exploded')
      },
    })

    expect(result).toBe('ok')
    expect(task).toHaveBeenCalledTimes(2)
  })
})

describe('retryWithBackoff cancellation', () => {
  test('rejects immediately when the signal is already aborted', async () => {
    const controller = new AbortController()
    controller.abort()
    const task = jest.fn(async () => 'nope')

    await expect(
      retryWithBackoff(task, { signal: controller.signal, sleep: instantSleep }),
    ).rejects.toBeInstanceOf(AbortError)
    expect(task).not.toHaveBeenCalled()
  })

  test('stops retrying when the signal aborts during backoff', async () => {
    const controller = new AbortController()
    const task = jest.fn(async () => {
      throw new Error('always fails')
    })

    const promise = retryWithBackoff(task, {
      maxRetries: 5,
      initialDelayMs: 50,
      jitter: false,
      signal: controller.signal,
      sleep: realSleep,
    })

    // Abort while the first backoff is still pending.
    setTimeout(() => controller.abort(), 10)

    await expect(promise).rejects.toBeInstanceOf(AbortError)
    expect(task).toHaveBeenCalledTimes(1)
  })

  test('does not wrap a cancellation in RetryExhaustedError', async () => {
    const controller = new AbortController()
    const task = (signal: AbortSignal) =>
      new Promise<string>((_resolve, reject) => {
        signal.addEventListener('abort', () => reject(new Error('inner')))
      })

    const promise = retryWithBackoff(task, {
      maxRetries: 3,
      sleep: instantSleep,
      signal: controller.signal,
    })
    controller.abort()

    await expect(promise).rejects.toBeInstanceOf(AbortError)
  })
})
