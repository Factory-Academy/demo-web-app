import { withTimeout } from '@/lib/resilience/timeout'
import { TimeoutError } from '@/lib/resilience/errors'

describe('withTimeout', () => {
  beforeEach(() => jest.useFakeTimers())
  afterEach(() => jest.useRealTimers())

  test('resolves when the operation settles before the timeout', async () => {
    const promise = withTimeout(() => Promise.resolve('ok'), 1000)
    await expect(promise).resolves.toBe('ok')
  })

  test('rejects with TimeoutError when the operation is too slow', async () => {
    const promise = withTimeout(() => new Promise<string>(() => {}), 1000)
    const assertion = expect(promise).rejects.toBeInstanceOf(TimeoutError)
    jest.advanceTimersByTime(1000)
    await assertion
  })

  test('propagates a rejection from the operation', async () => {
    const boom = new Error('boom')
    const promise = withTimeout(() => Promise.reject(boom), 1000)
    await expect(promise).rejects.toBe(boom)
  })

  test('surfaces a synchronous throw inside the operation', async () => {
    const promise = withTimeout(() => {
      throw new Error('sync boom')
    }, 1000)
    await expect(promise).rejects.toThrow('sync boom')
  })

  test('rejects an invalid timeout value', () => {
    expect(() => withTimeout(() => Promise.resolve(1), 0)).toThrow(RangeError)
    expect(() => withTimeout(() => Promise.resolve(1), -5)).toThrow(RangeError)
  })
})
