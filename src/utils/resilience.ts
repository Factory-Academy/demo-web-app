/**
 * Resilience composition.
 *
 * Combines {@link retryWithBackoff} with a {@link CircuitBreaker} into a single
 * caller. Each retry attempt runs through the breaker, so individual failures
 * count toward tripping it. Once the breaker opens, the resulting
 * {@link CircuitOpenError} is treated as non-retryable, letting the caller fail
 * fast instead of hammering a known-bad dependency.
 */
import { retryWithBackoff, RetryOptions } from './retry-utils'
import {
  CircuitBreaker,
  CircuitBreakerOptions,
  CircuitOpenError,
} from './circuit-breaker'

/** Configuration for {@link createResilientCaller}. */
export interface ResilienceOptions {
  /** Retry/backoff behavior applied around each call. */
  retry?: RetryOptions
  /**
   * Circuit-breaker configuration, or an existing breaker instance to share
   * across callers that guard the same dependency.
   */
  circuitBreaker?: CircuitBreakerOptions | CircuitBreaker
}

/** A caller that applies retry + circuit-breaker protection to operations. */
export interface ResilientCaller {
  /** Run an operation with retry and circuit-breaker protection. */
  call<T>(fn: () => Promise<T>): Promise<T>
  /** The underlying breaker, exposed for inspection and shared reuse. */
  readonly breaker: CircuitBreaker
}

function isBreakerInstance(
  value: CircuitBreakerOptions | CircuitBreaker | undefined
): value is CircuitBreaker {
  return value instanceof CircuitBreaker
}

/**
 * Build a {@link ResilientCaller} from retry and circuit-breaker options.
 *
 * @param options - Retry and breaker configuration. See {@link ResilienceOptions}.
 * @returns A caller plus the breaker it uses.
 */
export function createResilientCaller(
  options: ResilienceOptions = {}
): ResilientCaller {
  const breaker = isBreakerInstance(options.circuitBreaker)
    ? options.circuitBreaker
    : new CircuitBreaker(options.circuitBreaker)

  const userIsRetryable = options.retry?.isRetryable ?? (() => true)

  const retryOptions: RetryOptions = {
    ...options.retry,
    // Never retry a fail-fast rejection from an open breaker; honor the
    // caller's predicate for every other error.
    isRetryable: (error: unknown) =>
      !(error instanceof CircuitOpenError) && userIsRetryable(error),
  }

  return {
    breaker,
    call<T>(fn: () => Promise<T>): Promise<T> {
      return retryWithBackoff(() => breaker.execute(fn), retryOptions)
    },
  }
}
