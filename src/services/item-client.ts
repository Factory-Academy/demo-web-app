import { Item, ItemCreate } from '@/models/item'
import {
  CircuitOpenError,
  ResilientExecutor,
  TimeoutError,
} from '@/lib/resilience'
import { TypedEmitter } from '@/lib/events'

/** Error carrying the HTTP status for a non-2xx response. */
export class HttpError extends Error {
  constructor(
    public readonly status: number,
    public readonly statusText = '',
  ) {
    super(`HTTP ${status}${statusText ? ` ${statusText}` : ''}`)
    this.name = 'HttpError'
    // Required for `instanceof` under the ES5 compile target.
    Object.setPrototypeOf(this, HttpError.prototype)
  }
}

/**
 * Status codes worth retrying: request timeout, too-early, rate limiting, and
 * the 5xx family. Other 4xx codes are caller errors and will not improve on
 * retry.
 */
export function isRetryableStatus(status: number): boolean {
  return (
    status === 408 ||
    status === 425 ||
    status === 429 ||
    (status >= 500 && status <= 599)
  )
}

/**
 * Decide whether an error thrown during a request should be retried.
 * Exported so a custom {@link ResilientExecutor} can reuse the same policy.
 */
export function isRetryableError(error: unknown): boolean {
  // An open breaker must not be retried — it should fail fast.
  if (error instanceof CircuitOpenError) return false
  if (error instanceof TimeoutError) return true
  if (error instanceof HttpError) return isRetryableStatus(error.status)
  // `fetch` rejects network-level failures (DNS, connection reset) as
  // `TypeError`; these are transient and worth retrying.
  if (error instanceof TypeError) return true
  return false
}

/**
 * Observability events emitted by {@link ItemClient}. One logical call emits a
 * single `request` and then exactly one of `success` / `error`, regardless of
 * how many underlying retry attempts the resilient executor makes. `created`
 * additionally fires once a `createItem` call succeeds.
 */
export interface ItemClientEvents {
  request: { method: string; url: string }
  success: { method: string; url: string }
  error: { method: string; url: string; error: unknown }
  created: Item
}

export interface ItemClientOptions {
  /** Prefix for request URLs. Empty string targets the same origin. */
  baseUrl?: string
  /** Injectable fetch implementation (for tests or server runtimes). */
  fetchImpl?: typeof fetch
  /** Per-request timeout in ms. Defaults to 5000. */
  timeoutMs?: number
  /** Max retries after the initial attempt. Defaults to 3. */
  retries?: number
  /** Supply a pre-built executor (e.g. shared breaker, custom sleep). */
  executor?: ResilientExecutor
  /** Supply a pre-built emitter (e.g. to share one across clients). */
  emitter?: TypedEmitter<ItemClientEvents>
}

/**
 * HTTP client for the items API, hardened with retry-with-backoff and a
 * circuit breaker. Every request flows through {@link ResilientExecutor} so
 * transient failures are retried and a struggling backend trips the breaker.
 */
export class ItemClient {
  private readonly baseUrl: string
  private readonly fetchImpl: typeof fetch
  private readonly executor: ResilientExecutor

  /**
   * Subscribe to request lifecycle events. Listener errors are swallowed and
   * reported through `onError` so instrumentation can never break a request.
   */
  readonly events: TypedEmitter<ItemClientEvents>

  constructor(options: ItemClientOptions = {}) {
    this.baseUrl = options.baseUrl ?? ''
    this.events =
      options.emitter ??
      new TypedEmitter<ItemClientEvents>({
        onError: () => {
          // A misbehaving observer must not fail the HTTP call it observes.
        },
      })

    const rawFetch = options.fetchImpl ?? fetch
    // Preserve correct `this` for the global fetch to avoid "Illegal
    // invocation" when it is stored as a bare reference.
    this.fetchImpl = ((input: RequestInfo | URL, init?: RequestInit) =>
      rawFetch(input, init)) as typeof fetch

    this.executor =
      options.executor ??
      new ResilientExecutor({
        retry: {
          retries: options.retries ?? 3,
          timeoutMs: options.timeoutMs ?? 5_000,
          shouldRetry: isRetryableError,
          backoff: {
            baseDelayMs: 100,
            maxDelayMs: 2_000,
            factor: 2,
            jitter: 'full',
          },
        },
        circuit: {
          failureThreshold: 5,
          successThreshold: 1,
          openDurationMs: 10_000,
        },
      })
  }

  /** Fetch all items. */
  listItems(signal?: AbortSignal): Promise<Item[]> {
    return this.send('GET', '/api/items', () =>
      this.fetchImpl(this.url('/api/items'), { method: 'GET', signal }),
    )
  }

  /** Create a new item. */
  async createItem(input: ItemCreate, signal?: AbortSignal): Promise<Item> {
    const item = await this.send<Item>('POST', '/api/items', () =>
      this.fetchImpl(this.url('/api/items'), {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(input),
        signal,
      }),
    )
    this.events.emit('created', item)
    return item
  }

  /**
   * Run one request through the resilient executor while emitting exactly one
   * `request` up front and one terminal `success` / `error` — collapsing the
   * executor's internal retry attempts into a single logical lifecycle.
   */
  private async send<T>(
    method: string,
    path: string,
    call: () => Promise<Response>,
  ): Promise<T> {
    const url = this.url(path)
    this.events.emit('request', { method, url })
    try {
      const result = await this.executor.execute<T>(async () =>
        this.parse<T>(await call()),
      )
      this.events.emit('success', { method, url })
      return result
    } catch (error) {
      this.events.emit('error', { method, url, error })
      throw error
    }
  }

  private url(path: string): string {
    return `${this.baseUrl}${path}`
  }

  private async parse<T>(res: Response): Promise<T> {
    if (!res.ok) {
      throw new HttpError(res.status, res.statusText)
    }
    return (await res.json()) as T
  }
}
