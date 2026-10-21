/**
 * Retry-with-backoff + circuit-breaker toolkit.
 *
 * Typical usage: build a {@link ResilientExecutor} and wrap each outbound
 * call with `executor.execute(...)`. The individual primitives are also
 * exported for standalone use and unit testing.
 */

export {
  ResilienceError,
  TimeoutError,
  CircuitOpenError,
  RetryExhaustedError,
} from './errors'

export {
  type JitterStrategy,
  type BackoffOptions,
  DEFAULT_BACKOFF,
  computeBackoffDelay,
} from './backoff'

export { withTimeout } from './timeout'

export {
  type CircuitState,
  type CircuitBreakerOptions,
  DEFAULT_CIRCUIT,
  CircuitBreaker,
} from './circuit-breaker'

export {
  type SleepFn,
  type RetryOptions,
  defaultSleep,
  retry,
} from './retry'

export {
  type ResilientOptions,
  ResilientExecutor,
  createResilientExecutor,
} from './resilient'
