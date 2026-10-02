import { Item } from '@/models/item'
import {
  createResilientCaller,
  ResilienceOptions,
  ResilientCaller,
} from '@/utils/resilience'

/**
 * Error thrown when the items API responds with a non-2xx status. Carries the
 * HTTP status so callers (and the resilience layer) can decide how to react.
 */
export class HttpError extends Error {
  constructor(public readonly status: number, message?: string) {
    super(message ?? `Request failed with status ${status}`)
    this.name = 'HttpError'
    // Required for `instanceof` to work when compiled to ES5.
    Object.setPrototypeOf(this, HttpError.prototype)
  }
}

/** Options for constructing an {@link ItemClient}. */
export interface ItemClientOptions {
  /** Base URL the items endpoint is mounted under. Default '' (same origin). */
  baseUrl?: string
  /** Injectable fetch implementation. Defaults to the global `fetch`. */
  fetchFn?: typeof fetch
  /** Overrides for retry and circuit-breaker behavior. */
  resilience?: ResilienceOptions
}

/**
 * Only transient faults should be retried: 5xx responses, HTTP 429, and
 * network/timeout errors (which are not {@link HttpError}s). A 4xx other than
 * 429 reflects a bad request and will never succeed on retry.
 */
function isTransient(error: unknown): boolean {
  if (error instanceof HttpError) {
    return error.status >= 500 || error.status === 429
  }
  return true
}

/**
 * Client for the items API. The {@link fetchItems} call is wrapped in a
 * retry-with-backoff + circuit-breaker layer so transient upstream failures
 * are retried and a persistently failing endpoint is short-circuited.
 */
export class ItemClient {
  private readonly baseUrl: string
  private readonly fetchFn: typeof fetch
  private readonly resilient: ResilientCaller

  constructor(options: ItemClientOptions = {}) {
    this.baseUrl = options.baseUrl ?? ''
    // Bind so the global fetch keeps its expected `this`.
    const providedFetch = options.fetchFn ?? globalThis.fetch
    this.fetchFn = providedFetch.bind(globalThis)

    const resilience = options.resilience ?? {}
    this.resilient = createResilientCaller({
      ...resilience,
      retry: {
        timeoutMs: 5000,
        isRetryable: isTransient,
        ...resilience.retry,
      },
    })
  }

  /** The circuit breaker guarding this client, exposed for inspection. */
  get breaker() {
    return this.resilient.breaker
  }

  /**
   * Fetch all items from the API with retry and circuit-breaker protection.
   *
   * @returns The list of items on success.
   * @throws HttpError on a non-retryable error response.
   * @throws CircuitOpenError when the breaker has tripped.
   * @throws RetryError when all retry attempts are exhausted.
   */
  async fetchItems(): Promise<Item[]> {
    return this.resilient.call(async () => {
      const response = await this.fetchFn(`${this.baseUrl}/api/items`)
      if (!response.ok) {
        throw new HttpError(response.status)
      }
      return (await response.json()) as Item[]
    })
  }
}
