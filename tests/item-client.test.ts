import {
  ItemClient,
  HttpError,
  isRetryableHttpError,
} from '../src/services/item-client'
import {
  CircuitOpenError,
  TimeoutError,
} from '../src/services/resilience-errors'
import { Item } from '../src/models/item'

const instantSleep = () => Promise.resolve()

function jsonResponse(body: unknown, init: { status?: number; statusText?: string } = {}): Response {
  const status = init.status ?? 200
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: init.statusText ?? 'OK',
    json: async () => body,
    text: async () => JSON.stringify(body),
  } as unknown as Response
}

const sampleItem: Item = {
  id: '1',
  name: 'Test',
  status: 'active',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
}

describe('isRetryableHttpError', () => {
  test('classifies errors as expected', () => {
    expect(isRetryableHttpError(new TimeoutError(100))).toBe(true)
    expect(isRetryableHttpError(new CircuitOpenError(100))).toBe(false)
    expect(isRetryableHttpError(new HttpError(500, 'Server Error'))).toBe(true)
    expect(isRetryableHttpError(new HttpError(503, 'Unavailable'))).toBe(true)
    expect(isRetryableHttpError(new HttpError(429, 'Too Many Requests'))).toBe(true)
    expect(isRetryableHttpError(new HttpError(404, 'Not Found'))).toBe(false)
    expect(isRetryableHttpError(new HttpError(400, 'Bad Request'))).toBe(false)
    expect(isRetryableHttpError(new TypeError('network down'))).toBe(true)
  })
})

describe('ItemClient', () => {
  test('listItems returns parsed items on success', async () => {
    const fetchFn = jest.fn(async () => jsonResponse([sampleItem]))
    const client = new ItemClient({
      fetchFn: fetchFn as unknown as typeof fetch,
      resilience: { retry: { sleep: instantSleep } },
    })

    const items = await client.listItems()
    expect(items).toEqual([sampleItem])
    expect(fetchFn).toHaveBeenCalledTimes(1)
    expect(fetchFn).toHaveBeenCalledWith(
      '/api/items',
      expect.objectContaining({ method: 'GET' }),
    )
  })

  test('listItems retries a 500 then succeeds', async () => {
    let calls = 0
    const fetchFn = jest.fn(async () => {
      calls++
      if (calls === 1) return jsonResponse({ error: 'boom' }, { status: 500, statusText: 'Server Error' })
      return jsonResponse([sampleItem])
    })

    const client = new ItemClient({
      fetchFn: fetchFn as unknown as typeof fetch,
      resilience: { retry: { maxRetries: 2, sleep: instantSleep, jitter: false } },
    })

    const items = await client.listItems()
    expect(items).toEqual([sampleItem])
    expect(fetchFn).toHaveBeenCalledTimes(2)
  })

  test('listItems does not retry a 404 and throws HttpError', async () => {
    const fetchFn = jest.fn(async () =>
      jsonResponse({ error: 'missing' }, { status: 404, statusText: 'Not Found' }),
    )
    const client = new ItemClient({
      fetchFn: fetchFn as unknown as typeof fetch,
      resilience: { retry: { maxRetries: 3, sleep: instantSleep } },
    })

    await expect(client.listItems()).rejects.toBeInstanceOf(HttpError)
    expect(fetchFn).toHaveBeenCalledTimes(1)
  })

  test('createItem posts a JSON body and returns the created item', async () => {
    const fetchFn = jest.fn(async () => jsonResponse(sampleItem, { status: 201, statusText: 'Created' }))
    const client = new ItemClient({
      fetchFn: fetchFn as unknown as typeof fetch,
      resilience: { retry: { sleep: instantSleep } },
    })

    const created = await client.createItem({ name: 'Test', status: 'active' })
    expect(created).toEqual(sampleItem)

    const [, init] = fetchFn.mock.calls[0] as [string, RequestInit]
    expect(init.method).toBe('POST')
    expect(init.body).toBe(JSON.stringify({ name: 'Test', status: 'active' }))
  })

  test('respects a custom baseUrl', async () => {
    const fetchFn = jest.fn(async () => jsonResponse([]))
    const client = new ItemClient({
      baseUrl: 'https://api.example.com',
      fetchFn: fetchFn as unknown as typeof fetch,
      resilience: { retry: { sleep: instantSleep } },
    })

    await client.listItems()
    expect(fetchFn).toHaveBeenCalledWith(
      'https://api.example.com/api/items',
      expect.anything(),
    )
  })

  test('opens the circuit after repeated server failures', async () => {
    const fetchFn = jest.fn(async () =>
      jsonResponse({ error: 'down' }, { status: 500, statusText: 'Server Error' }),
    )
    const client = new ItemClient({
      fetchFn: fetchFn as unknown as typeof fetch,
      resilience: {
        retry: { maxRetries: 10, sleep: instantSleep },
        circuitBreaker: { failureThreshold: 3 },
      },
    })

    await expect(client.listItems()).rejects.toBeInstanceOf(CircuitOpenError)
    // 3 attempts trip the breaker; the 4th short-circuits before fetching.
    expect(fetchFn).toHaveBeenCalledTimes(3)
    expect(client.getCircuitState()).toBe('open')
  })
})
