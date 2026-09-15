import { CircuitBreakerOptions, RetryOptions } from '@/models/resilience'
import { ConfigError } from '@/services/resilience-errors'

/**
 * Default and validation logic for the resilience options.
 *
 * Defaults live here (rather than next to their consumers) so that both the
 * consumers and the validators can share them without an import cycle.
 */

/**
 * Default retry policy: up to 3 retries, starting at 100ms and doubling up to
 * a 2s ceiling, with full jitter and no per-attempt timeout. Every error is
 * treated as retryable unless a custom `shouldRetry` is supplied.
 */
export const DEFAULT_RETRY_OPTIONS: RetryOptions = {
  maxRetries: 3,
  initialDelayMs: 100,
  maxDelayMs: 2000,
  backoffFactor: 2,
  jitter: true,
  timeoutMs: 0,
  shouldRetry: () => true,
}

/**
 * Default breaker policy: trip after 5 consecutive failures, require 2
 * consecutive successes to recover, wait 30s before probing, and allow a
 * single probe at a time while half-open.
 */
export const DEFAULT_CIRCUIT_BREAKER_OPTIONS: CircuitBreakerOptions = {
  failureThreshold: 5,
  successThreshold: 2,
  resetTimeoutMs: 30000,
  halfOpenMaxProbes: 1,
}

function describe(value: unknown): string {
  return typeof value === 'number' ? String(value) : JSON.stringify(value)
}

function requireInteger(name: string, value: number, min: number): void {
  if (!Number.isInteger(value) || value < min) {
    throw new ConfigError(
      `${name} must be an integer >= ${min} (received ${describe(value)})`,
    )
  }
}

function requireFiniteAtLeast(name: string, value: number, min: number): void {
  if (!Number.isFinite(value) || value < min) {
    throw new ConfigError(
      `${name} must be a finite number >= ${min} (received ${describe(value)})`,
    )
  }
}

/**
 * Merges partial retry options over the defaults and validates the result,
 * throwing a {@link ConfigError} for any nonsensical value.
 */
export function resolveRetryOptions(
  partial: Partial<RetryOptions> = {},
): RetryOptions {
  const options: RetryOptions = { ...DEFAULT_RETRY_OPTIONS, ...partial }

  requireInteger('retry.maxRetries', options.maxRetries, 0)
  requireFiniteAtLeast('retry.initialDelayMs', options.initialDelayMs, 0)
  requireFiniteAtLeast('retry.maxDelayMs', options.maxDelayMs, 0)
  requireFiniteAtLeast('retry.backoffFactor', options.backoffFactor, 1)

  if (!Number.isFinite(options.timeoutMs)) {
    throw new ConfigError(
      `retry.timeoutMs must be a finite number (received ${describe(options.timeoutMs)})`,
    )
  }
  if (typeof options.shouldRetry !== 'function') {
    throw new ConfigError('retry.shouldRetry must be a function')
  }

  return options
}

/**
 * Merges partial circuit-breaker options over the defaults and validates the
 * result, throwing a {@link ConfigError} for any nonsensical value.
 */
export function resolveCircuitBreakerOptions(
  partial: Partial<CircuitBreakerOptions> = {},
): CircuitBreakerOptions {
  const options: CircuitBreakerOptions = {
    ...DEFAULT_CIRCUIT_BREAKER_OPTIONS,
    ...partial,
  }

  requireInteger('circuitBreaker.failureThreshold', options.failureThreshold, 1)
  requireInteger('circuitBreaker.successThreshold', options.successThreshold, 1)
  requireFiniteAtLeast('circuitBreaker.resetTimeoutMs', options.resetTimeoutMs, 0)
  requireInteger(
    'circuitBreaker.halfOpenMaxProbes',
    options.halfOpenMaxProbes ?? DEFAULT_CIRCUIT_BREAKER_OPTIONS.halfOpenMaxProbes ?? 1,
    1,
  )

  return options
}
