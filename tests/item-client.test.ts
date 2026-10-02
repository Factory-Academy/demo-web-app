import { ItemClient, HttpError } from '../src/services/item-client'
import { CircuitOpenError } from '../src/utils/circuit-breaker'
import { RetryError } from '../src/utils/retry-utils'
import { Item } from '../src/models/item'

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  } as unknown as Response
}

function errorResponse(status: number): Response {
  return {
    ok: false,
    status,
    json: () => Promise.resolve({}),
  } as unknown as Response
}

const sampleItems: Item[] = [
  {
    id: '1',
    name: 'First',
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
]

// Fast, deterministic resilience config shared across tests. The injected
// no-op sleep also drives the per-attempt timeout timer, so timeouts are
// disabled here and exercised explicitly in a dedicated test.
const fastResilience = {
  retry: { sleep: () => Promise.resolve(), jitter: false, timeoutMs: 0 },
}

describe('ItemClient.fetchItems', () => {
  test('returns parsed items on success', async () => {
    const fetchFn = jest.fn().mockResolvedValue(jsonResponse(sampleItems))
    const client = new ItemClient({ fetchFn, resilience: fastResilience })

    await expect(client.fetchItems()).resolves.toEqual(sampleItems)
    expect(fetchFn).toHaveBeenCalledTimes(1)
    expect(fetchFn).toHaveBeenCalledWith('/api/items')
  })

  test('prepends the configured base URL', async () => {
    const fetchFn = jest.fn().mockResolvedValue(jsonResponse(sampleItems))
    const client = new ItemClient({
      fetchFn,
      baseUrl: 'https://api.example.com',
      resilience: fastResilience,
    })

    await client.fetchItems()
    expect(fetchFn).toHaveBeenCalledWith('https://api.example.com/api/items')
  })

  test('retries a 5xx response and succeeds on a later attempt', async () => {
    const fetchFn = jest
      .fn()
      .mockResolvedValueOnce(errorResponse(503))
      .mockResolvedValue(jsonResponse(sampleItems))
    const client = new ItemClient({ fetchFn, resilience: fastResilience })

    await expect(client.fetchItems()).resolves.toEqual(sampleItems)
    expect(fetchFn).toHaveBeenCalledTimes(2)
  })

  test('retries HTTP 429 (rate limited)', async () => {
    const fetchFn = jest
      .fn()
      .mockResolvedValueOnce(errorResponse(429))
      .mockResolvedValue(jsonResponse(sampleItems))
    const client = new ItemClient({ fetchFn, resilience: fastResilience })

    await expect(client.fetchItems()).resolves.toEqual(sampleItems)
    expect(fetchFn).toHaveBeenCalledTimes(2)
  })

  test('does not retry a 4xx client error', async () => {
    const fetchFn = jest.fn().mockResolvedValue(errorResponse(400))
    const client = new ItemClient({ fetchFn, resilience: fastResilience })

    const promise = client.fetchItems()
    await expect(promise).rejects.toBeInstanceOf(HttpError)
    await expect(promise).rejects.toMatchObject({ status: 400 })
    expect(fetchFn).toHaveBeenCalledTimes(1)
  })

  test('retries network errors and wraps exhaustion in RetryError', async () => {
    const fetchFn = jest.fn().mockRejectedValue(new Error('ECONNRESET'))
    const client = new ItemClient({
      fetchFn,
      resilience: {
        retry: {
          sleep: () => Promise.resolve(),
          jitter: false,
          maxAttempts: 3,
          timeoutMs: 0,
        },
        circuitBreaker: { failureThreshold: 10 },
      },
    })

    await expect(client.fetchItems()).rejects.toBeInstanceOf(RetryError)
    expect(fetchFn).toHaveBeenCalledTimes(3)
  })

  test('trips the breaker after repeated failures and then fails fast', async () => {
    const fetchFn = jest.fn().mockResolvedValue(errorResponse(500))
    const client = new ItemClient({
      fetchFn,
      resilience: {
        retry: {
          sleep: () => Promise.resolve(),
          jitter: false,
          maxAttempts: 5,
          timeoutMs: 0,
        },
        circuitBreaker: { failureThreshold: 2 },
      },
    })

    await expect(client.fetchItems()).rejects.toBeInstanceOf(CircuitOpenError)
    expect(client.breaker.state).toBe('open')
    const callsAfterTrip = fetchFn.mock.calls.length

    // A subsequent call short-circuits without touching fetch again.
    await expect(client.fetchItems()).rejects.toBeInstanceOf(CircuitOpenError)
    expect(fetchFn).toHaveBeenCalledTimes(callsAfterTrip)
  })

  test('surfaces a per-attempt timeout as a retryable failure', async () => {
    // Uses real timers (small values) so the hung first attempt times out and
    // the resolved second attempt wins its race fairly.
    const fetchFn = jest
      .fn()
      .mockImplementationOnce(() => new Promise(() => {})) // never resolves
      .mockResolvedValue(jsonResponse(sampleItems))
    const client = new ItemClient({
      fetchFn,
      resilience: {
        retry: { jitter: false, timeoutMs: 30, initialDelayMs: 1 },
      },
    })

    await expect(client.fetchItems()).resolves.toEqual(sampleItems)
    expect(fetchFn).toHaveBeenCalledTimes(2)
  })
})
