import { HttpError, ItemClient, isRetryableError } from '@/services/item-client'
import type { ItemClientEvents } from '@/services/item-client'
import { ResilientExecutor, ResilientOptions } from '@/lib/resilience'
import { TypedEmitter } from '@/lib/events'

function jsonResponse(body: unknown, init?: { status?: number }): Response {
  const status = init?.status ?? 200
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: '',
    json: async () => body,
  } as Response
}

function fetchReturning(...responses: Array<Partial<Response>>) {
  const queue = [...responses]
  return jest.fn(async () =>
    queue.length > 1 ? queue.shift()! : queue[0],
  ) as unknown as typeof fetch
}

/** Instant-backoff executor so these tests never wait on real timers. */
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

const sample = { id: '1', name: 'A', status: 'active', createdAt: '', updatedAt: '' }

/** Record every emitted event in order for assertions. */
function recordEvents(client: ItemClient) {
  const log: Array<{ type: string; payload: unknown }> = []
  const types: Array<keyof ItemClientEvents> = [
    'request',
    'success',
    'error',
    'created',
  ]
  for (const type of types) {
    client.events.on(type, (payload) => log.push({ type, payload }))
  }
  return log
}

describe('ItemClient events', () => {
  test('a successful listItems emits request then success exactly once', async () => {
    const client = new ItemClient({
      fetchImpl: fetchReturning(jsonResponse([sample])),
      executor: fastExecutor(),
    })
    const log = recordEvents(client)

    await client.listItems()

    expect(log.map((e) => e.type)).toEqual(['request', 'success'])
    expect(log[0].payload).toEqual({ method: 'GET', url: '/api/items' })
  })

  test('createItem emits request, success, then created with the item', async () => {
    const client = new ItemClient({
      fetchImpl: fetchReturning(jsonResponse(sample, { status: 201 })),
      executor: fastExecutor(),
    })
    const log = recordEvents(client)

    await client.createItem({ name: 'A' })

    expect(log.map((e) => e.type)).toEqual(['request', 'success', 'created'])
    expect(log[2].payload).toEqual(sample)
  })

  test('internal retries collapse into a single request/success pair', async () => {
    const client = new ItemClient({
      fetchImpl: fetchReturning(
        jsonResponse(null, { status: 503 }),
        jsonResponse([sample]),
      ),
      executor: fastExecutor(),
    })
    const log = recordEvents(client)

    await client.listItems()

    expect(log.map((e) => e.type)).toEqual(['request', 'success'])
  })

  test('a failed request emits an error carrying the underlying error', async () => {
    const client = new ItemClient({
      fetchImpl: fetchReturning(jsonResponse(null, { status: 400 })),
      executor: fastExecutor(),
    })
    const log = recordEvents(client)

    await client.listItems().catch(() => undefined)

    expect(log.map((e) => e.type)).toEqual(['request', 'error'])
    const payload = log[1].payload as ItemClientEvents['error']
    expect(payload.error).toBeInstanceOf(HttpError)
    expect((payload.error as HttpError).status).toBe(400)
  })

  test('a thrown listener never breaks the request it observes', async () => {
    const client = new ItemClient({
      fetchImpl: fetchReturning(jsonResponse([sample])),
      executor: fastExecutor(),
    })
    client.events.on('success', () => {
      throw new Error('observer blew up')
    })

    await expect(client.listItems()).resolves.toEqual([sample])
  })

  test('an injected emitter is used instead of the default', async () => {
    const emitter = new TypedEmitter<ItemClientEvents>()
    const client = new ItemClient({
      fetchImpl: fetchReturning(jsonResponse([sample])),
      executor: fastExecutor(),
      emitter,
    })
    expect(client.events).toBe(emitter)

    const requests: unknown[] = []
    emitter.on('request', (p) => requests.push(p))
    await client.listItems()
    expect(requests).toHaveLength(1)
  })
})
