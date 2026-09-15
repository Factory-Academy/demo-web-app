# Feature Flag System

## Overview

This project now includes a lightweight, environment-driven feature flag system. Feature flags allow you to toggle features on or off without code changes, making it easy to control feature rollout, A/B testing, and environment-specific behavior.

## Architecture

The feature flag system is built around three core components:

1. **Interface** (`IFeatureFlagProvider`): Defines the contract for feature flag evaluation
2. **Implementation** (`EnvFeatureFlagProvider`): Reads flags from environment variables
3. **Integration**: Services accept the interface as a dependency for testability

## Usage

### Basic Usage

Set environment variables with the prefix `FEATURE_FLAG_`:

```bash
# Enable a feature
export FEATURE_FLAG_ENHANCED_VALIDATION=true

# Disable a feature
export FEATURE_FLAG_BETA_FEATURES=false
```

Use the default feature flag provider in your code:

```typescript
import { featureFlags } from '@/services/feature-flags'

// Check if a feature is enabled (defaults to false if not set)
if (featureFlags.isEnabled('enhanced_validation')) {
  // Use enhanced validation logic
}

// Check with a custom default
if (featureFlags.isEnabledWithDefault('experimental_ui', true)) {
  // Experimental UI is enabled by default
}
```

### Advanced Usage

#### Custom Prefix

Create a provider with a custom environment variable prefix:

```typescript
import { EnvFeatureFlagProvider } from '@/services/feature-flags'

const customFlags = new EnvFeatureFlagProvider('APP_FEATURE_')
// Now reads from APP_FEATURE_* environment variables
```

#### Dependency Injection

Services accept the feature flag provider as a constructor parameter for better testability:

```typescript
import { ItemService } from '@/services/item-service'
import { featureFlags } from '@/services/feature-flags'

// Use default provider
const service1 = new ItemService()

// Use custom provider
const service2 = new ItemService(featureFlags)
```

#### Get All Flags

Retrieve all configured feature flags:

```typescript
const allFlags = featureFlags.getAllFlags()
console.log(allFlags)
// Output: { enhanced_validation: true, beta_features: false }
```

## Environment Variable Format

Feature flags accept various truthy/falsy values:

**Truthy values** (case-insensitive):
- `true`
- `1`
- `yes`
- `on`

**Falsy values** (case-insensitive):
- `false`
- `0`
- `no`
- `off`

Any other value is treated as `false`.

## Testing

### Mock Provider

Use a mock provider in tests for predictable behavior:

```typescript
import { IFeatureFlagProvider } from '@/models/feature-flag'

class MockFeatureFlagProvider implements IFeatureFlagProvider {
  private flags = new Map<string, boolean>()

  setFlag(key: string, value: boolean) {
    this.flags.set(key, value)
  }

  isEnabled(key: string): boolean {
    return this.flags.get(key) || false
  }

  // ... implement other methods
}

// In your test
const mockFlags = new MockFeatureFlagProvider()
mockFlags.setFlag('my_feature', true)
const service = new ItemService(mockFlags)
```

### Integration Testing

Test with actual environment variables:

```typescript
describe('with feature flags', () => {
  beforeEach(() => {
    process.env.FEATURE_FLAG_TEST_FEATURE = 'true'
  })

  test('uses feature when enabled', () => {
    const provider = new EnvFeatureFlagProvider()
    expect(provider.isEnabled('test_feature')).toBe(true)
  })
})
```

## Real-World Example

The `ItemService` uses feature flags to conditionally enable enhanced validation:

```typescript
// src/services/item-service.ts
export class ItemService {
  private readonly flags: IFeatureFlagProvider

  constructor(flags?: IFeatureFlagProvider) {
    this.flags = flags || featureFlags
  }

  validate(data: Partial<Item>): { valid: boolean; errors: string[] } {
    const errors: string[] = []
    
    // Always run basic validation
    if (!data.name?.trim()) {
      errors.push('Name is required')
    }
    
    // Conditionally apply enhanced rules
    if (this.flags.isEnabled('enhanced_validation')) {
      if (data.name && data.name.trim().length < 3) {
        errors.push('Name must be at least 3 characters')
      }
    }
    
    return { valid: errors.length === 0, errors }
  }
}
```

## Best Practices

1. **Default to off**: Feature flags should default to `false` for safety
2. **Meaningful names**: Use descriptive snake_case names (e.g., `enhanced_validation`, not `flag1`)
3. **Document flags**: Comment the purpose and expected behavior when using flags
4. **Remove old flags**: Clean up flags once features are fully rolled out
5. **Test both paths**: Write tests for both enabled and disabled states
6. **Inject dependencies**: Accept the interface in constructors for testability

## Files Modified/Created

- `src/models/feature-flag.ts` - Interface definitions
- `src/services/feature-flags.ts` - Implementation
- `src/services/item-service.ts` - Integration example
- `tests/feature-flags.test.ts` - Feature flag tests
- `tests/items.test.ts` - Updated with feature flag testing
- `NOTES.md` - This documentation

## Future Enhancements

Possible extensions to consider:

- Remote flag configuration (database, API, etc.)
- User-based targeting (enable for specific users)
- Percentage rollouts (enable for X% of traffic)
- Flag analytics and usage tracking
- Admin UI for managing flags

---

# Resilience: Retry-with-Backoff + Circuit Breaker

## Overview

The app now ships a small resilience toolkit for calling unreliable
dependencies (HTTP APIs, in particular). It combines three well-known patterns:

1. **Retry with exponential backoff** — transient failures are retried with a
   growing, jittered delay instead of a tight loop.
2. **Per-attempt timeout** — a slow attempt is aborted and treated as a
   failure rather than hanging indefinitely.
3. **Circuit breaker** — once a dependency starts failing consistently, calls
   fail fast for a cool-down window instead of piling on more load.

These are composed by a single `ResilientExecutor`, and wired into the items
API through `ItemClient`.

## Architecture

| Concern | File | Export |
|---|---|---|
| Types & options | `src/models/resilience.ts` | `RetryOptions`, `CircuitBreakerOptions`, `CircuitState`, ... |
| Error types | `src/services/resilience-errors.ts` | `TimeoutError`, `CircuitOpenError`, `RetryExhaustedError` |
| Retry + timeout | `src/services/retry.ts` | `retryWithBackoff`, `withTimeout`, `computeBackoffDelay` |
| Circuit breaker | `src/services/circuit-breaker.ts` | `CircuitBreaker` |
| Composition | `src/services/resilient-executor.ts` | `ResilientExecutor` |
| API client | `src/services/item-client.ts` | `ItemClient`, `HttpError`, `isRetryableHttpError` |

The layering, from innermost to outermost, is:

```
retry( breaker( timeout( task ) ) )
```

The timeout sits **inside** the breaker on purpose: a timed-out attempt must be
counted as a breaker failure, otherwise a slow-but-not-erroring dependency
would never trip the circuit.

## Usage

### The resilient client

`ItemClient` wraps the existing `/api/items` route. Every call is guarded by the
executor, so callers get retries and circuit breaking for free.

```typescript
import { ItemClient } from '@/services/item-client'

const client = new ItemClient()

const items = await client.listItems()
const created = await client.createItem({ name: 'New task', status: 'active' })

// Inspect breaker health (e.g. for a status indicator)
client.getCircuitState() // 'closed' | 'open' | 'half-open'
```

By default the client retries up to 3 times, starts backoff at 100ms, applies a
5s per-attempt timeout, and treats timeouts, 5xx, 429, and network errors as
retryable. 4xx errors (other than 429) are surfaced immediately as `HttpError`.

### Custom resilience settings

```typescript
const client = new ItemClient({
  baseUrl: 'https://api.example.com',
  resilience: {
    retry: { maxRetries: 5, initialDelayMs: 200, timeoutMs: 3000 },
    circuitBreaker: { failureThreshold: 10, resetTimeoutMs: 60000 },
  },
})
```

### Using the primitives directly

The executor works with any async task, not just HTTP:

```typescript
import { ResilientExecutor } from '@/services/resilient-executor'

const executor = new ResilientExecutor({
  retry: { maxRetries: 3, timeoutMs: 2000 },
  circuitBreaker: { failureThreshold: 5, resetTimeoutMs: 30000 },
})

const result = await executor.execute((signal) => doSomething(signal))
```

`retryWithBackoff`, `withTimeout`, and `CircuitBreaker` are also exported for
standalone use.

## Circuit breaker states

- **closed** — calls flow through; consecutive failures are counted. Hitting
  `failureThreshold` trips the breaker to `open`.
- **open** — calls are rejected immediately with `CircuitOpenError`. After
  `resetTimeoutMs`, the next call moves the breaker to `half-open`.
- **half-open** — a probe call is allowed. `successThreshold` consecutive
  successes return it to `closed`; any failure sends it back to `open`.

## Edge cases handled

- **Timeouts** abort the in-flight attempt via `AbortSignal` (so `fetch` is
  actually cancelled) and reject with `TimeoutError`, which wins the race even
  if the aborted task rejects first.
- **Non-retryable errors** (per `shouldRetry`) propagate immediately, unwrapped.
- **Exhausted retries** throw `RetryExhaustedError` with the original failure on
  `.cause`.
- **Open circuit mid-retry** stops the retry loop: `CircuitOpenError` is never
  retried.
- **Full jitter** de-synchronizes retries across many callers to avoid a
  thundering herd.

## Testing

All timing is injectable, so tests run instantly and deterministically:

- `sleep` — replace the backoff delay with `() => Promise.resolve()`.
- `now` — feed the circuit breaker a fake clock to advance the reset timeout.
- `random` — make jitter deterministic.
- `fetchFn` — inject a mock `fetch` into `ItemClient`.

See `tests/retry.test.ts`, `tests/circuit-breaker.test.ts`,
`tests/resilient-executor.test.ts`, and `tests/item-client.test.ts`.

## Test tooling

The repo had `ts-jest` installed but no Jest config, so `jest.config.js` was
added to run the TypeScript test suite (with the `@/*` path alias mapped to
`src/`). Type checking is still handled by `tsc --noEmit`.

## Files created / modified

- `src/models/resilience.ts` - Type and option definitions
- `src/services/resilience-errors.ts` - `TimeoutError`, `CircuitOpenError`, `RetryExhaustedError`
- `src/services/retry.ts` - `retryWithBackoff`, `withTimeout`, `computeBackoffDelay`
- `src/services/circuit-breaker.ts` - `CircuitBreaker`
- `src/services/resilient-executor.ts` - `ResilientExecutor`
- `src/services/item-client.ts` - `ItemClient` wired to `/api/items`
- `tests/retry.test.ts`, `tests/circuit-breaker.test.ts`, `tests/resilient-executor.test.ts`, `tests/item-client.test.ts` - Test suites
- `jest.config.js` - Jest + ts-jest configuration
- `NOTES.md` - This documentation

## Future Enhancements

- Shared breaker registry keyed by host/endpoint
- Metrics/telemetry hooks on state changes and retries
- `Retry-After` header support for 429/503 responses
- Bulkhead (concurrency limiting) to complement the breaker

## Follow-up: edge-case hardening

A review pass tightened the edge cases around cancellation, configuration, and
concurrency. These are additive; the public API is unchanged except for two new
optional inputs (a `signal` on retry options / client requests and
`halfOpenMaxProbes` on the breaker).

### Cancellation (`AbortError`)

Callers can now cancel an entire resilient operation, not just a single attempt.

```typescript
const controller = new AbortController()
const items = client.listItems({ signal: controller.signal })
controller.abort() // rejects with AbortError
```

Cancellation is threaded through every layer:

- `withTimeout` accepts an external `signal`; an already-aborted signal fails
  fast, and a mid-flight abort surfaces as `AbortError` regardless of how the
  underlying task rejected once its signal fired (a timeout keeps its own
  `TimeoutError`, since the external signal is not the cause).
- `retryWithBackoff` checks the signal before each attempt and cuts a pending
  backoff short (`abortableSleep`), so a doomed retry never proceeds.
- **Cancellation is not a failure.** It is never retried, and the circuit
  breaker ignores `AbortError` so a caller walking away can't trip the circuit.

### Configuration validation (`ConfigError`)

Options are now validated centrally in `services/resilience-config.ts`
(`resolveRetryOptions`, `resolveCircuitBreakerOptions`). Nonsensical values fail
loudly with a `ConfigError` naming the offending field instead of silently
misbehaving:

- `retry`: `maxRetries` (integer >= 0), `initialDelayMs`/`maxDelayMs` (finite
  >= 0), `backoffFactor` (finite >= 1), finite `timeoutMs`, function
  `shouldRetry`.
- `circuitBreaker`: `failureThreshold`/`successThreshold`/`halfOpenMaxProbes`
  (integers >= 1), `resetTimeoutMs` (finite >= 0).

  Previously, e.g. `failureThreshold: 0` would trip the breaker on the very
  first failure — now it's rejected outright.

### Concurrent half-open probes

While `half-open`, the breaker admits at most `halfOpenMaxProbes` concurrent
trial calls (default 1); extra concurrent callers are rejected with
`CircuitOpenError`. This stops a burst of traffic from all stampeding a
dependency that is only tentatively healthy.

### Callback isolation

`onRetry`, `onTimeout`, and `onStateChange` are observability hooks. They are now
invoked through `safeInvoke`, so a throwing hook can't derail the retry loop or a
breaker state transition.

### New / changed files

- `src/services/resilience-config.ts` - defaults + option validation (new)
- `src/services/resilience-util.ts` - `safeInvoke`, `abortableSleep` (new)
- `src/services/resilience-errors.ts` - added `AbortError`, `ConfigError`
- `src/models/resilience.ts` - added `RetryOptions.signal`,
  `CircuitBreakerOptions.halfOpenMaxProbes`
- `src/services/retry.ts` - signal-aware `withTimeout`, cancellation + hook
  isolation in `retryWithBackoff`
- `src/services/circuit-breaker.ts` - probe gating, `AbortError` handling,
  hook isolation
- `src/services/resilient-executor.ts` - threads the signal through all layers
- `src/services/item-client.ts` - optional per-request `signal`
- `tests/resilience-config.test.ts` - validation coverage (new)
- `tests/retry.test.ts`, `tests/circuit-breaker.test.ts`,
  `tests/resilient-executor.test.ts`, `tests/item-client.test.ts` - added
  cancellation, concurrency, and hook-isolation cases
