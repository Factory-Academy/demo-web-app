# Resilience utilities

A small, dependency-free toolkit for calling flaky dependencies safely:
retry-with-backoff, a circuit breaker, and a composition of the two. It is
wired into `ItemClient.fetchItems` as the first real consumer.

## Modules

| File | Exports | Responsibility |
|---|---|---|
| `src/utils/retry-utils.ts` | `retryWithBackoff`, `computeBackoffDelay`, `withTimeout`, `RetryError`, `TimeoutError`, `AbortError` | Retry an async op with exponential backoff, jitter, per-attempt timeouts, and cancellation. |
| `src/utils/circuit-breaker.ts` | `CircuitBreaker`, `CircuitOpenError`, `CircuitState` | Trip after consecutive failures, fail fast during a cool-down, recover via a half-open probe. |
| `src/utils/resilience.ts` | `createResilientCaller`, `ResilientCaller`, `ResilienceOptions` | Compose retry + breaker into one caller. |
| `src/services/item-client.ts` | `ItemClient`, `HttpError` | API client whose `fetchItems` call is protected by the resilience layer. |

## How retry and the breaker compose

`createResilientCaller` runs **each retry attempt through the breaker**, so
individual failures count toward tripping it. Once the breaker opens, its
`CircuitOpenError` is treated as **non-retryable**, so the caller stops
immediately instead of hammering a dependency that is already known to be down.

```
retryWithBackoff(
  () => breaker.execute(fn),   // every attempt is guarded
  { isRetryable: err => !(err instanceof CircuitOpenError) && userPredicate(err) }
)
```

## Backoff

Delay for retry `n` (zero-based) is:

```
min(maxDelayMs, initialDelayMs * backoffFactor^n)
```

With `jitter` enabled (default) the delay uses **equal jitter**: half the
computed delay is fixed and the other half is randomized, keeping retries
spread out without ever collapsing to zero. Defaults: `maxAttempts: 3`,
`initialDelayMs: 100`, `maxDelayMs: 2000`, `backoffFactor: 2`.

## Circuit breaker states

- **closed** — calls pass through; a success resets the consecutive-failure
  count. After `failureThreshold` consecutive failures the breaker trips.
- **open** — calls fail fast with `CircuitOpenError` until `resetTimeoutMs`
  has elapsed since it opened.
- **half-open** — a single probe is allowed through. `successThreshold`
  successes close the breaker; any failure re-opens it and restarts the
  cool-down. Concurrent callers during a probe fail fast.

Defaults: `failureThreshold: 5`, `successThreshold: 1`, `resetTimeoutMs: 30000`.

## Edge cases handled

- **Per-attempt timeout** — `withTimeout` races the operation against a timer
  and rejects with `TimeoutError`, which is retryable by default. The operation
  itself is not cancelled; pass an `AbortSignal` into your own function for true
  cancellation.
- **Cancellation** — an aborted `signal` stops retries with `AbortError`.
- **Non-retryable failures** — surfaced unchanged (not wrapped), so a `400`
  from the API is thrown as-is rather than retried.
- **Exhausted retries** — wrapped in `RetryError` with `attempts` and the
  original error on `cause`, so callers can tell "gave up" from "rejected".
- **Which HTTP errors retry** — `ItemClient` retries `5xx`, `429`, and
  network/timeout errors; other `4xx` responses fail fast.

### Timing is injectable

`sleep`, `random`, and the breaker's `now` are all injectable. This keeps tests
fast and deterministic. Note that the injected `sleep` also drives the
per-attempt timeout timer, so a no-op `sleep` makes any enabled timeout fire
immediately; tests either disable the timeout (`timeoutMs: 0`) or use real
timers when exercising timeout behavior specifically.

## Usage

```ts
import { ItemClient } from '@/services/item-client'

const client = new ItemClient({ baseUrl: 'https://api.example.com' })
const items = await client.fetchItems() // retried + breaker-protected

// Or wrap any async operation directly:
import { createResilientCaller } from '@/utils/resilience'

const { call, breaker } = createResilientCaller({
  retry: { maxAttempts: 4, initialDelayMs: 200 },
  circuitBreaker: { failureThreshold: 3, resetTimeoutMs: 10000 },
})
const data = await call(() => doSomethingFlaky())
console.log(breaker.state) // 'closed' | 'open' | 'half-open'
```

## Tests

- `tests/retry-utils.test.ts` — backoff math, jitter bounds, timeout, abort,
  non-retryable passthrough, `RetryError` wrapping, option validation.
- `tests/circuit-breaker.test.ts` — threshold trip, fail-fast, cool-down,
  half-open open/close/re-open, single-probe concurrency, `isFailure`,
  state-change callbacks, reset.
- `tests/resilience.test.ts` — composition behavior, mid-retry trip,
  predicate passthrough, shared breaker instances.
- `tests/item-client.test.ts` — success, base URL, 5xx/429 retry, 4xx
  fail-fast, network-error exhaustion, breaker trip, per-attempt timeout.

Run them with:

```bash
npx jest tests/retry-utils.test.ts tests/circuit-breaker.test.ts \
  tests/resilience.test.ts tests/item-client.test.ts
```
