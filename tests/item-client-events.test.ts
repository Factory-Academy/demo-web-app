import { ItemClient, ItemClientEvents, isRetryableError } from '@/services/item-client'
import { ResilientExecutor, ResilientOptions } from '@/lib/resilience'

function jsonResponse(body: unknown, init?: { status?: number }): Response {
  const status = init?.status ?? 200
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: '',
    json: async () => body,
  } as Response
}

function fetchReturning(...responses: Response[]) {
  const queue = [...responses]
  return jest.fn(async () => (queue.length > 1 ? queue.shift()! : queue[0])) as unknown as typeof fetch
}

/** Executor with instant backoff so these tests never wait on real timers. */
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

/** Record every emitted event in order for assertions. */
function recordEvents(client: ItemClient) {
  const log: Array<{ type: keyof ItemClientEvents; payload: unknown }> = []
  client.events.on('request:start', (p) => log.push({ type: 'request:start', payload: p }))
  client.events.on('request:retry', (p) => log.push({ type: 'request:retry', payload: p }))
  client.events.on('request:success', (p) => log.push({ type: 'request:success', payload: p }))
  client.events.on('request:error', (p) => log.push({ type: 'request:error', payload: p }))
  return log
}

const sample = { id: '1', name: 'A', status: 'active', createdAt: '', updatedAt: '' }

describe('ItemClient events — success path', () => {
  test('emits start then success with no retries', async () => {
    const fetchImpl = fetchReturning(jsonResponse([sample]))
    const client = new ItemClient({ fetchImpl, executor: fastExecutor() })
    const log = recordEvents(client)

    await client.listItems()

    expect(log.map((e) => e.type)).toEqual(['request:start', 'request:success'])
    expect(log[0].payload).toEqual({ method: 'GET', url: '/api/items' })
    const success = log[1].payload as ItemClientEvents['request:success']
    expect(success.method).toBe('GET')
    expect(typeof success.durationMs).toBe('number')
    expect(success.durationMs).toBeGreaterThanOrEqual(0)
  })

  test('createItem reports the POST method', async () => {
    const fetchImpl = fetchReturning(jsonResponse(sample, { status: 201 }))
    const client = new ItemClient({ fetchImpl, executor: fastExecutor() })
    const log = recordEvents(client)

    await client.createItem({ name: 'A' })

    expect(log.map((e) => e.type)).toEqual(['request:start', 'request:success'])
    expect((log[0].payload as ItemClientEvents['request:start']).method).toBe('POST')
  })
})

describe('ItemClient events — retry path', () => {
  test('emits a retry event per re-attempt before success', async () => {
    const fetchImpl = fetchReturning(
      jsonResponse(null, { status: 503 }),
      jsonResponse(null, { status: 503 }),
      jsonResponse([sample]),
    )
    const client = new ItemClient({ fetchImpl, executor: fastExecutor() })
    const log = recordEvents(client)

    await client.listItems()

    expect(log.map((e) => e.type)).toEqual([
      'request:start',
      'request:retry',
      'request:retry',
      'request:success',
    ])
    expect((log[1].payload as ItemClientEvents['request:retry']).attempt).toBe(1)
    expect((log[2].payload as ItemClientEvents['request:retry']).attempt).toBe(2)
  })
})

describe('ItemClient events — error path', () => {
  test('emits start then error with the surfaced error', async () => {
    const fetchImpl = fetchReturning(jsonResponse(null, { status: 400 }))
    const client = new ItemClient({ fetchImpl, executor: fastExecutor() })
    const log = recordEvents(client)

    await client.listItems().catch(() => {})

    expect(log.map((e) => e.type)).toEqual(['request:start', 'request:error'])
    const error = log[1].payload as ItemClientEvents['request:error']
    expect(error.error).toBeDefined()
    expect(error.method).toBe('GET')
  })
})

describe('ItemClient events — shared bus', () => {
  test('an injected emitter is reused instead of creating a new one', () => {
    const client = new ItemClient()
    const other = new ItemClient({ events: client.events })
    expect(other.events).toBe(client.events)
  })
})
