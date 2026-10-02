import {
  retryWithBackoff,
  computeBackoffDelay,
  withTimeout,
  RetryError,
  TimeoutError,
  AbortError,
} from '../src/utils/retry-utils'

// A sleep that resolves immediately but records the requested delays, so tests
// stay fast while still asserting on backoff timing.
function recordingSleep() {
  const delays: number[] = []
  const sleep = (ms: number) => {
    delays.push(ms)
    return Promise.resolve()
  }
  return { delays, sleep }
}

describe('computeBackoffDelay', () => {
  const base = {
    initialDelayMs: 100,
    maxDelayMs: 2000,
    backoffFactor: 2,
    jitter: false,
    random: () => 0,
  }

  test('grows exponentially without jitter', () => {
    expect(computeBackoffDelay(0, base)).toBe(100)
    expect(computeBackoffDelay(1, base)).toBe(200)
    expect(computeBackoffDelay(2, base)).toBe(400)
    expect(computeBackoffDelay(3, base)).toBe(800)
  })

  test('caps at maxDelayMs', () => {
    expect(computeBackoffDelay(10, base)).toBe(2000)
  })

  test('applies equal jitter within [half, full] of the capped delay', () => {
    const low = computeBackoffDelay(1, { ...base, jitter: true, random: () => 0 })
    const high = computeBackoffDelay(1, { ...base, jitter: true, random: () => 1 })
    expect(low).toBe(100) // half of 200
    expect(high).toBe(200) // full 200
  })
})

describe('withTimeout', () => {
  test('resolves when the operation finishes in time', async () => {
    await expect(withTimeout(Promise.resolve('ok'), 1000)).resolves.toBe('ok')
  })

  test('rejects with TimeoutError when the timer fires first', async () => {
    const never = new Promise<string>(() => {})
    // Immediate "timer" so the timeout always wins.
    await expect(
      withTimeout(never, 50, () => Promise.resolve())
    ).rejects.toBeInstanceOf(TimeoutError)
  })

  test('propagates the operation error', async () => {
    const boom = Promise.reject(new Error('boom'))
    await expect(withTimeout(boom, 0)).rejects.toThrow('boom')
  })

  test('disables the timeout when timeoutMs <= 0', async () => {
    await expect(withTimeout(Promise.resolve(42), 0)).resolves.toBe(42)
  })
})

describe('retryWithBackoff', () => {
  test('returns immediately on first success', async () => {
    const fn = jest.fn().mockResolvedValue('value')
    const { sleep, delays } = recordingSleep()

    const result = await retryWithBackoff(fn, { sleep })

    expect(result).toBe('value')
    expect(fn).toHaveBeenCalledTimes(1)
    expect(delays).toEqual([])
  })

  test('retries until a later attempt succeeds', async () => {
    const fn = jest
      .fn()
      .mockRejectedValueOnce(new Error('fail-1'))
      .mockRejectedValueOnce(new Error('fail-2'))
      .mockResolvedValue('ok')
    const { sleep, delays } = recordingSleep()

    const result = await retryWithBackoff(fn, {
      sleep,
      jitter: false,
      initialDelayMs: 100,
      backoffFactor: 2,
    })

    expect(result).toBe('ok')
    expect(fn).toHaveBeenCalledTimes(3)
    expect(delays).toEqual([100, 200])
  })

  test('passes the zero-based attempt number to the operation', async () => {
    const seen: number[] = []
    const fn = jest.fn().mockImplementation((attempt: number) => {
      seen.push(attempt)
      return attempt < 2 ? Promise.reject(new Error('x')) : Promise.resolve('done')
    })
    const { sleep } = recordingSleep()

    await retryWithBackoff(fn, { sleep, jitter: false })

    expect(seen).toEqual([0, 1, 2])
  })

  test('wraps the final error in RetryError once attempts are exhausted', async () => {
    const fn = jest.fn().mockRejectedValue(new Error('still failing'))
    const { sleep } = recordingSleep()

    const promise = retryWithBackoff(fn, { sleep, maxAttempts: 3 })

    await expect(promise).rejects.toBeInstanceOf(RetryError)
    await expect(promise).rejects.toMatchObject({ attempts: 3 })
    expect(fn).toHaveBeenCalledTimes(3)
  })

  test('preserves the causing error on RetryError.cause', async () => {
    const cause = new Error('root cause')
    const fn = jest.fn().mockRejectedValue(cause)
    const { sleep } = recordingSleep()

    await retryWithBackoff(fn, { sleep, maxAttempts: 2 }).catch((err) => {
      expect(err).toBeInstanceOf(RetryError)
      expect((err as RetryError).cause).toBe(cause)
    })
  })

  test('does not retry non-retryable errors and rethrows them unchanged', async () => {
    const fatal = new Error('do not retry')
    const fn = jest.fn().mockRejectedValue(fatal)
    const { sleep, delays } = recordingSleep()

    const promise = retryWithBackoff(fn, {
      sleep,
      maxAttempts: 5,
      isRetryable: () => false,
    })

    await expect(promise).rejects.toBe(fatal)
    expect(fn).toHaveBeenCalledTimes(1)
    expect(delays).toEqual([])
  })

  test('invokes onRetry with error, attempt, and delay', async () => {
    const fn = jest
      .fn()
      .mockRejectedValueOnce(new Error('one'))
      .mockResolvedValue('ok')
    const onRetry = jest.fn()
    const { sleep } = recordingSleep()

    await retryWithBackoff(fn, {
      sleep,
      jitter: false,
      initialDelayMs: 100,
      onRetry,
    })

    expect(onRetry).toHaveBeenCalledTimes(1)
    expect(onRetry).toHaveBeenCalledWith(expect.any(Error), 1, 100)
  })

  test('treats a per-attempt timeout as a retryable failure', async () => {
    const fn = jest
      .fn()
      .mockImplementationOnce(() => new Promise(() => {})) // hangs -> times out
      .mockResolvedValue('recovered')
    const { sleep } = recordingSleep()

    const result = await retryWithBackoff(fn, {
      sleep,
      timeoutMs: 10,
      jitter: false,
    })

    expect(result).toBe('recovered')
    expect(fn).toHaveBeenCalledTimes(2)
  })

  test('stops immediately when the signal is already aborted', async () => {
    const controller = new AbortController()
    controller.abort()
    const fn = jest.fn().mockResolvedValue('nope')
    const { sleep } = recordingSleep()

    await expect(
      retryWithBackoff(fn, { sleep, signal: controller.signal })
    ).rejects.toBeInstanceOf(AbortError)
    expect(fn).not.toHaveBeenCalled()
  })

  test('rejects invalid options', async () => {
    await expect(retryWithBackoff(async () => 1, { maxAttempts: 0 })).rejects.toBeInstanceOf(
      RangeError
    )
    await expect(
      retryWithBackoff(async () => 1, { backoffFactor: 0.5 })
    ).rejects.toBeInstanceOf(RangeError)
  })

  test('runs exactly once with maxAttempts = 1', async () => {
    const fn = jest.fn().mockRejectedValue(new Error('fail'))
    const { sleep, delays } = recordingSleep()

    await expect(
      retryWithBackoff(fn, { sleep, maxAttempts: 1 })
    ).rejects.toBeInstanceOf(RetryError)
    expect(fn).toHaveBeenCalledTimes(1)
    expect(delays).toEqual([])
  })
})
