import { retry } from '@/lib/resilience/retry'
import { RetryExhaustedError, TimeoutError } from '@/lib/resilience/errors'

/** Instant sleep that records the requested delays. */
function recordingSleep() {
  const delays: number[] = []
  const sleep = (ms: number) => {
    delays.push(ms)
    return Promise.resolve()
  }
  return { sleep, delays }
}

const noJitter = { baseDelayMs: 100, maxDelayMs: 10_000, factor: 2, jitter: 'none' as const }

describe('retry', () => {
  test('returns immediately when the first attempt succeeds', async () => {
    const op = jest.fn().mockResolvedValue('ok')
    const result = await retry(op, { retries: 3 })
    expect(result).toBe('ok')
    expect(op).toHaveBeenCalledTimes(1)
  })

  test('retries until success and applies backoff delays', async () => {
    const { sleep, delays } = recordingSleep()
    const op = jest
      .fn()
      .mockRejectedValueOnce(new Error('1'))
      .mockRejectedValueOnce(new Error('2'))
      .mockResolvedValue('ok')

    const result = await retry(op, { retries: 3, backoff: noJitter, sleep })
    expect(result).toBe('ok')
    expect(op).toHaveBeenCalledTimes(3)
    expect(delays).toEqual([100, 200])
  })

  test('throws RetryExhaustedError after exhausting all retries', async () => {
    const { sleep } = recordingSleep()
    const last = new Error('final')
    const op = jest
      .fn()
      .mockRejectedValueOnce(new Error('first'))
      .mockRejectedValue(last)

    const error = await retry(op, { retries: 2, backoff: noJitter, sleep }).catch((e) => e)
    expect(error).toBeInstanceOf(RetryExhaustedError)
    expect(error.attempts).toBe(3)
    expect(error.lastError).toBe(last)
    expect(op).toHaveBeenCalledTimes(3)
  })

  test('re-throws a non-retryable error without wrapping', async () => {
    const { sleep } = recordingSleep()
    const fatal = new Error('fatal')
    const op = jest.fn().mockRejectedValue(fatal)

    const error = await retry(op, {
      retries: 5,
      backoff: noJitter,
      sleep,
      shouldRetry: () => false,
    }).catch((e) => e)

    expect(error).toBe(fatal)
    expect(op).toHaveBeenCalledTimes(1)
  })

  test('fires onRetry / onError / onSuccess hooks', async () => {
    const { sleep } = recordingSleep()
    const onRetry = jest.fn()
    const onError = jest.fn()
    const onSuccess = jest.fn()
    const op = jest.fn().mockRejectedValueOnce(new Error('x')).mockResolvedValue('ok')

    await retry(op, { retries: 2, backoff: noJitter, sleep, onRetry, onError, onSuccess })

    expect(onError).toHaveBeenCalledTimes(1)
    expect(onRetry).toHaveBeenCalledTimes(1)
    expect(onRetry).toHaveBeenCalledWith(expect.any(Error), 0, 100)
    expect(onSuccess).toHaveBeenCalledWith(1)
  })

  test('honours retries = 0 (single attempt)', async () => {
    const op = jest.fn().mockRejectedValue(new Error('once'))
    const error = await retry(op, { retries: 0 }).catch((e) => e)
    expect(error).toBeInstanceOf(RetryExhaustedError)
    expect(op).toHaveBeenCalledTimes(1)
  })

  test('applies a per-attempt timeout', async () => {
    jest.useFakeTimers()
    const { sleep } = recordingSleep()
    // First attempt hangs forever (times out); second resolves.
    const op = jest
      .fn()
      .mockImplementationOnce(() => new Promise(() => {}))
      .mockResolvedValue('recovered')

    const promise = retry(op, { retries: 1, timeoutMs: 500, backoff: noJitter, sleep })
    // Let the hanging first attempt hit its timeout.
    await jest.advanceTimersByTimeAsync(500)
    await expect(promise).resolves.toBe('recovered')
    jest.useRealTimers()
  })

  test('counts a timeout as a retryable failure', async () => {
    jest.useFakeTimers()
    const { sleep } = recordingSleep()
    const onError = jest.fn()
    const op = jest.fn().mockImplementation(() => new Promise(() => {}))

    const promise = retry(op, {
      retries: 1,
      timeoutMs: 500,
      backoff: noJitter,
      sleep,
      onError,
    }).catch((e) => e)

    await jest.advanceTimersByTimeAsync(500) // first attempt times out
    await jest.advanceTimersByTimeAsync(500) // second attempt times out
    const error = await promise

    expect(error).toBeInstanceOf(RetryExhaustedError)
    expect(error.lastError).toBeInstanceOf(TimeoutError)
    expect(onError).toHaveBeenCalledTimes(2)
    jest.useRealTimers()
  })

  test('rejects invalid retries', async () => {
    await expect(retry(() => Promise.resolve(1), { retries: -1 })).rejects.toBeInstanceOf(
      RangeError,
    )
  })
})
