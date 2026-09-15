import { Item, ItemCreate } from '@/models/item'
import { ResilienceOptions } from '@/models/resilience'
import { ResilientExecutor } from '@/services/resilient-executor'
import { CircuitOpenError, TimeoutError } from '@/services/resilience-errors'

/**
 * Error raised when the items API responds with a non-2xx status.
 *
 * See `services/resilience-errors.ts` for why the prototype is restored.
 */
export class HttpError extends Error {
  readonly status: number
  readonly statusText: string
  readonly body?: string

  constructor(status: number, statusText: string, body?: string) {
    super(`HTTP ${status} ${statusText}`)
    this.name = 'HttpError'
    this.status = status
    this.statusText = statusText
    this.body = body
    Object.setPrototypeOf(this, HttpError.prototype)
  }
}

/**
 * Default classifier for HTTP-style failures.
 *
 * Retryable:
 * - Timeouts (the request may simply have been slow).
 * - 5xx server errors and 429 (Too Many Requests).
 * - Network-level errors (typically a `TypeError` thrown by `fetch`).
 *
 * Not retryable:
 * - A tripped circuit breaker (handled by the executor, listed for clarity).
 * - 4xx client errors other than 429, which won't succeed on retry.
 *
 * @param error - The error thrown by an attempt.
 * @returns true if the error is worth retrying.
 */
export function isRetryableHttpError(error: unknown): boolean {
  if (error instanceof CircuitOpenError) return false
  if (error instanceof TimeoutError) return true
  if (error instanceof HttpError) {
    return error.status >= 500 || error.status === 429
  }
  // Network failures and other unexpected errors: give them another try.
  return true
}

/**
 * Options for constructing an {@link ItemClient}.
 */
export interface ItemClientOptions {
  /** Base URL prefix for requests. Defaults to '' (same-origin). */
  baseUrl?: string
  /** Injectable `fetch` implementation, defaults to the global `fetch`. */
  fetchFn?: typeof fetch
  /** Resilience overrides merged over the client defaults. */
  resilience?: ResilienceOptions
  /** A pre-built executor, taking precedence over `resilience`. */
  executor?: ResilientExecutor
}

const DEFAULT_TIMEOUT_MS = 5000

/**
 * A thin client for the items API (`/api/items`) that wraps every request in
 * the retry-with-backoff + circuit-breaker executor.
 *
 * Transient failures (timeouts, 5xx, 429, network blips) are retried with
 * exponential backoff; a run of failures trips the breaker so the app fails
 * fast instead of piling requests onto a struggling backend.
 *
 * @example
 * const client = new ItemClient()
 * const items = await client.listItems()
 * const created = await client.createItem({ name: 'New task', status: 'active' })
 */
export class ItemClient {
  private readonly baseUrl: string
  private readonly fetchFn: typeof fetch
  private readonly executor: ResilientExecutor

  constructor(options: ItemClientOptions = {}) {
    this.baseUrl = options.baseUrl ?? ''
    this.fetchFn = options.fetchFn ?? fetch
    this.executor =
      options.executor ??
      new ResilientExecutor({
        retry: {
          maxRetries: 3,
          initialDelayMs: 100,
          timeoutMs: DEFAULT_TIMEOUT_MS,
          shouldRetry: isRetryableHttpError,
          ...options.resilience?.retry,
        },
        circuitBreaker: options.resilience?.circuitBreaker,
      })
  }

  /**
   * The circuit breaker's current state, exposed for health checks and UI.
   */
  getCircuitState() {
    return this.executor.getState()
  }

  /**
   * Fetches all items.
   *
   * @throws {HttpError} On a non-2xx response.
   * @throws {CircuitOpenError} When the breaker is open.
   * @throws {RetryExhaustedError} When retries are exhausted.
   */
  async listItems(): Promise<Item[]> {
    return this.executor.execute(async (signal) => {
      const response = await this.fetchFn(this.url('/api/items'), {
        method: 'GET',
        headers: { Accept: 'application/json' },
        signal,
      })
      return this.parseJson<Item[]>(response)
    })
  }

  /**
   * Creates a new item.
   *
   * @param input - The item to create.
   * @throws {HttpError} On a non-2xx response.
   * @throws {CircuitOpenError} When the breaker is open.
   * @throws {RetryExhaustedError} When retries are exhausted.
   */
  async createItem(input: ItemCreate): Promise<Item> {
    return this.executor.execute(async (signal) => {
      const response = await this.fetchFn(this.url('/api/items'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(input),
        signal,
      })
      return this.parseJson<Item>(response)
    })
  }

  private url(path: string): string {
    return `${this.baseUrl}${path}`
  }

  private async parseJson<T>(response: Response): Promise<T> {
    if (!response.ok) {
      const body = await safeReadText(response)
      throw new HttpError(response.status, response.statusText, body)
    }
    return (await response.json()) as T
  }
}

async function safeReadText(response: Response): Promise<string | undefined> {
  try {
    return await response.text()
  } catch {
    return undefined
  }
}
