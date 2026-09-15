import {
  DEFAULT_CIRCUIT_BREAKER_OPTIONS,
  DEFAULT_RETRY_OPTIONS,
  resolveCircuitBreakerOptions,
  resolveRetryOptions,
} from '../src/services/resilience-config'
import { ConfigError } from '../src/services/resilience-errors'

describe('resolveRetryOptions', () => {
  test('fills defaults for omitted fields', () => {
    const opts = resolveRetryOptions({ maxRetries: 2 })
    expect(opts.maxRetries).toBe(2)
    expect(opts.initialDelayMs).toBe(DEFAULT_RETRY_OPTIONS.initialDelayMs)
    expect(opts.backoffFactor).toBe(DEFAULT_RETRY_OPTIONS.backoffFactor)
    expect(typeof opts.shouldRetry).toBe('function')
  })

  test('accepts a zero timeout (disabled) and zero retries', () => {
    expect(() => resolveRetryOptions({ maxRetries: 0, timeoutMs: 0 })).not.toThrow()
  })

  test.each([
    ['negative maxRetries', { maxRetries: -1 }],
    ['non-integer maxRetries', { maxRetries: 1.5 }],
    ['negative initialDelayMs', { initialDelayMs: -5 }],
    ['negative maxDelayMs', { maxDelayMs: -1 }],
    ['backoffFactor below 1', { backoffFactor: 0.5 }],
    ['non-finite timeoutMs', { timeoutMs: Infinity }],
    ['NaN initialDelayMs', { initialDelayMs: NaN }],
  ])('rejects %s with a ConfigError', (_label, partial) => {
    expect(() => resolveRetryOptions(partial as never)).toThrow(ConfigError)
  })

  test('rejects a non-function shouldRetry', () => {
    expect(() =>
      resolveRetryOptions({ shouldRetry: 'nope' as never }),
    ).toThrow(ConfigError)
  })

  test('ConfigError message names the offending field', () => {
    expect(() => resolveRetryOptions({ maxRetries: -3 })).toThrow(
      /retry\.maxRetries/,
    )
  })
})

describe('resolveCircuitBreakerOptions', () => {
  test('fills defaults including halfOpenMaxProbes', () => {
    const opts = resolveCircuitBreakerOptions({})
    expect(opts.failureThreshold).toBe(DEFAULT_CIRCUIT_BREAKER_OPTIONS.failureThreshold)
    expect(opts.successThreshold).toBe(DEFAULT_CIRCUIT_BREAKER_OPTIONS.successThreshold)
    expect(opts.resetTimeoutMs).toBe(DEFAULT_CIRCUIT_BREAKER_OPTIONS.resetTimeoutMs)
    expect(opts.halfOpenMaxProbes).toBe(1)
  })

  test.each([
    ['zero failureThreshold', { failureThreshold: 0 }],
    ['negative failureThreshold', { failureThreshold: -2 }],
    ['non-integer successThreshold', { successThreshold: 1.2 }],
    ['negative resetTimeoutMs', { resetTimeoutMs: -1 }],
    ['NaN resetTimeoutMs', { resetTimeoutMs: NaN }],
    ['zero halfOpenMaxProbes', { halfOpenMaxProbes: 0 }],
  ])('rejects %s with a ConfigError', (_label, partial) => {
    expect(() => resolveCircuitBreakerOptions(partial as never)).toThrow(ConfigError)
  })
})
