import {
  HttpError,
  ItemClient,
  isRetryableError,
  isRetryableStatus,
} from '@/services/item-client'
import {
  CircuitOpenError,
  ResilientExecutor,
  ResilientOptions,
  TimeoutError,
} from '@/lib/resilience'

/** Build a fetch stub that returns the queued responses in order. */
function fetchReturning(...responses: Array<Partial<Response> | (() => Promise<Response>)>) {
  const queue = [...responses]
  return jest.fn(async () => {
    const next = queue.length > 1 ? queue.shift()! : queue[0]
    if (typeof next === 'function') return next()
    return next as Response
  }) as unknown as typeof fetch
}

function jsonResponse(body: unknown, init?: { status?: number; ok?: boolean }): Response {
  const status = init?.status ?? 200
  return {
    ok: init?.ok ?? (status >= 200 && status < 300),
    status,
    statusText: '',
    json: async () => body,
  } as Response
}

/** Executor with instant backoff so client tests never wait on real timers. */
function fastExecutor(overrides?: ResilientOptions) {
  return new ResilientExecutor({
    retry: {
      retries: 3,
      shouldRetry: isRetryableError,
      backoff: { baseDelayMs: 1, maxDelayMs: 5, factor: 2, jitter: 'none' },
    },
    circuit: { failureThreshold: 5, successThreshold: 1, openDurationMs: 1000 },
    sleep: () => Promise.resolve(),
    ...overrides,
  })
}

describe('isRetryableStatus', () => {
  test('retries 408/425/429 and 5xx, not other 4xx', () => {
    expect(isRetryableStatus(408)).toBe(true)
    expect(isRetryableStatus(425)).toBe(true)
    expect(isRetryableStatus(429)).toBe(true)
    expect(isRetryableStatus(500)).toBe(true)
    expect(isRetryableStatus(503)).toBe(true)
    expect(isRetryableStatus(400)).toBe(false)
    expect(isRetryableStatus(404)).toBe(false)
  })
})

describe('isRetryableError', () => {
  test('classifies error types', () => {
    expect(isRetryableError(new TimeoutError(100))).toBe(true)
    expect(isRetryableError(new HttpError(503))).toBe(true)
    expect(isRetryableError(new HttpError(404))).toBe(false)
    expect(isRetryableError(new TypeError('network'))).toBe(true)
    expect(isRetryableError(new CircuitOpenError(100))).toBe(false)
    expect(isRetryableError(new Error('other'))).toBe(false)
  })
})

describe('ItemClient', () => {
  const sample = { id: '1', name: 'A', status: 'active', createdAt: '', updatedAt: '' }

  test('listItems returns parsed JSON on success', async () => {
    const fetchImpl = fetchReturning(jsonResponse([sample]))
    const client = new ItemClient({ fetchImpl, executor: fastExecutor() })
    await expect(client.listItems()).resolves.toEqual([sample])
    expect(fetchImpl).toHaveBeenCalledTimes(1)
  })

  test('retries a 503 then succeeds', async () => {
    const fetchImpl = fetchReturning(
      jsonResponse(null, { status: 503 }),
      jsonResponse([sample]),
    )
    const client = new ItemClient({ fetchImpl, executor: fastExecutor() })
    await expect(client.listItems()).resolves.toEqual([sample])
    expect(fetchImpl).toHaveBeenCalledTimes(2)
  })

  test('does not retry a 400 and surfaces an HttpError', async () => {
    const fetchImpl = fetchReturning(jsonResponse(null, { status: 400 }))
    const client = new ItemClient({ fetchImpl, executor: fastExecutor() })
    const error = await client.listItems().catch((e) => e)
    expect(error).toBeInstanceOf(HttpError)
    expect(error.status).toBe(400)
    expect(fetchImpl).toHaveBeenCalledTimes(1)
  })

  test('retries network-level TypeErrors', async () => {
    let calls = 0
    const fetchImpl = jest.fn(async () => {
      calls++
      if (calls === 1) throw new TypeError('Failed to fetch')
      return jsonResponse([sample])
    }) as unknown as typeof fetch
    const client = new ItemClient({ fetchImpl, executor: fastExecutor() })
    await expect(client.listItems()).resolves.toEqual([sample])
    expect(calls).toBe(2)
  })

  test('createItem POSTs the body and returns the created item', async () => {
    const fetchImpl = fetchReturning(jsonResponse(sample, { status: 201 }))
    const client = new ItemClient({ fetchImpl, executor: fastExecutor() })
    const result = await client.createItem({ name: 'A' })
    expect(result).toEqual(sample)
    const [, init] = (fetchImpl as jest.Mock).mock.calls[0]
    expect(init.method).toBe('POST')
    expect(JSON.parse(init.body)).toEqual({ name: 'A' })
  })

  test('opens the breaker after repeated failures and then fails fast', async () => {
    const fetchImpl = fetchReturning(() => Promise.resolve(jsonResponse(null, { status: 500 })))
    const executor = new ResilientExecutor({
      retry: {
        retries: 5,
        shouldRetry: isRetryableError,
        backoff: { baseDelayMs: 1, maxDelayMs: 5, factor: 2, jitter: 'none' },
      },
      circuit: { failureThreshold: 3, successThreshold: 1, openDurationMs: 1000 },
      sleep: () => Promise.resolve(),
    })
    const client = new ItemClient({ fetchImpl, executor })

    await client.listItems().catch((e) => e)
    expect((fetchImpl as jest.Mock).mock.calls.length).toBe(3) // breaker tripped

    const second = await client.listItems().catch((e) => e)
    expect(second).toBeInstanceOf(CircuitOpenError)
    expect((fetchImpl as jest.Mock).mock.calls.length).toBe(3) // no new request
  })

  describe('listItemsCursor', () => {
    test('fetches items with cursor and limit parameters', async () => {
      const response = {
        items: [sample],
        nextCursor: 'next-token',
        hasMore: true,
      }
      const fetchImpl = fetchReturning(jsonResponse(response))
      const client = new ItemClient({ fetchImpl, executor: fastExecutor() })

      const result = await client.listItemsCursor({ cursor: 'abc', limit: 10 })

      expect(result).toEqual(response)
      const [url] = (fetchImpl as jest.Mock).mock.calls[0]
      expect(url).toContain('cursor=abc')
      expect(url).toContain('limit=10')
    })

    test('fetches first page without cursor', async () => {
      const response = {
        items: [sample],
        nextCursor: 'page2',
        hasMore: true,
      }
      const fetchImpl = fetchReturning(jsonResponse(response))
      const client = new ItemClient({ fetchImpl, executor: fastExecutor() })

      const result = await client.listItemsCursor({ limit: 20 })

      expect(result).toEqual(response)
      const [url] = (fetchImpl as jest.Mock).mock.calls[0]
      expect(url).not.toContain('cursor=')
      expect(url).toContain('limit=20')
    })

    test('handles last page with null nextCursor', async () => {
      const response = {
        items: [sample],
        nextCursor: null,
        hasMore: false,
      }
      const fetchImpl = fetchReturning(jsonResponse(response))
      const client = new ItemClient({ fetchImpl, executor: fastExecutor() })

      const result = await client.listItemsCursor({ limit: 10 })

      expect(result.hasMore).toBe(false)
      expect(result.nextCursor).toBeNull()
    })

    test('validates limit and throws on zero', () => {
      const fetchImpl = fetchReturning(jsonResponse({ items: [], nextCursor: null, hasMore: false }))
      const client = new ItemClient({ fetchImpl, executor: fastExecutor() })

      expect(() => client.listItemsCursor({ limit: 0 })).toThrow('Limit must be greater than 0')
      expect(fetchImpl).not.toHaveBeenCalled()
    })

    test('validates limit and throws on negative value', () => {
      const fetchImpl = fetchReturning(jsonResponse({ items: [], nextCursor: null, hasMore: false }))
      const client = new ItemClient({ fetchImpl, executor: fastExecutor() })

      expect(() => client.listItemsCursor({ limit: -1 })).toThrow('Limit must be greater than 0')
      expect(fetchImpl).not.toHaveBeenCalled()
    })

    test('validates limit and throws when exceeding max', () => {
      const fetchImpl = fetchReturning(jsonResponse({ items: [], nextCursor: null, hasMore: false }))
      const client = new ItemClient({ fetchImpl, executor: fastExecutor() })

      expect(() => client.listItemsCursor({ limit: 150 })).toThrow('Limit must not exceed 100')
      expect(fetchImpl).not.toHaveBeenCalled()
    })

    test('retries transient errors like the base listItems', async () => {
      const response = {
        items: [sample],
        nextCursor: null,
        hasMore: false,
      }
      const fetchImpl = fetchReturning(
        jsonResponse(null, { status: 503 }),
        jsonResponse(response),
      )
      const client = new ItemClient({ fetchImpl, executor: fastExecutor() })

      const result = await client.listItemsCursor({ limit: 10 })

      expect(result).toEqual(response)
      expect(fetchImpl).toHaveBeenCalledTimes(2)
    })
  })
})
