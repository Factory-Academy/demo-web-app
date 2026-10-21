import { CircuitBreaker, CircuitBreakerOptions } from './circuit-breaker'
import { CircuitOpenError } from './errors'
import { retry, RetryOptions, SleepFn } from './retry'

export interface ResilientOptions {
  /** Retry + backoff + per-attempt timeout configuration. */
  retry?: Partial<RetryOptions>
  /** Circuit breaker configuration. Ignored if `circuitBreaker` is provided. */
  circuit?: Partial<CircuitBreakerOptions>
  /** Share an existing breaker across executors (e.g. one per host). */
  circuitBreaker?: CircuitBreaker
  /** Injectable sleep shared with the retry loop, for deterministic tests. */
  sleep?: SleepFn
}

/**
 * Combines retry-with-backoff and a circuit breaker into one call wrapper.
 *
 * Order of operations for `execute`:
 *  1. Reject up front with {@link CircuitOpenError} if the breaker is open.
 *  2. Run the operation through the retry loop. Each attempt's outcome is
 *     recorded on the breaker (so timeouts count as failures too).
 *  3. If a failed attempt trips the breaker, remaining retries are abandoned
 *     and the underlying error surfaces — the breaker is now open, so the
 *     *next* call short-circuits with {@link CircuitOpenError}.
 */
export class ResilientExecutor {
  readonly circuit: CircuitBreaker
  private readonly retryOptions: Partial<RetryOptions>
  private readonly sleep?: SleepFn

  constructor(options: ResilientOptions = {}) {
    this.circuit = options.circuitBreaker ?? new CircuitBreaker(options.circuit)
    this.retryOptions = options.retry ?? {}
    this.sleep = options.sleep ?? options.retry?.sleep
  }

  async execute<T>(operation: (attempt: number) => Promise<T>): Promise<T> {
    if (!this.circuit.canRequest()) {
      throw new CircuitOpenError(this.circuit.remainingOpenMs())
    }

    const baseShouldRetry = this.retryOptions.shouldRetry ?? (() => true)

    return retry(operation, {
      retries: 3,
      ...this.retryOptions,
      sleep: this.sleep ?? this.retryOptions.sleep,
      onSuccess: (attempt) => {
        this.circuit.onSuccess()
        this.retryOptions.onSuccess?.(attempt)
      },
      onError: (error, attempt) => {
        this.circuit.onFailure()
        this.retryOptions.onError?.(error, attempt)
      },
      // Stop retrying once the breaker opens, in addition to the caller's
      // own predicate. `onError` above runs first, so a failure that trips
      // the breaker is reflected here on the same attempt.
      shouldRetry: (error, attempt) =>
        this.circuit.canRequest() && baseShouldRetry(error, attempt),
    })
  }
}

export function createResilientExecutor(
  options?: ResilientOptions,
): ResilientExecutor {
  return new ResilientExecutor(options)
}
