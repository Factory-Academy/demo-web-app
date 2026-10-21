# Resilience utilities

A small, dependency-free toolkit for making outbound calls resilient:
retry-with-backoff plus a circuit breaker. It lives in
`src/lib/resilience/` and is wired into the items HTTP client
(`src/services/item-client.ts`).

## Why

Network calls fail in transient ways (timeouts, dropped connections, 5xx,
rate limiting). Blind retries make a struggling backend worse. This module
adds two complementary safeguards:

- **Retry with exponential backoff + jitter** recovers from brief blips
  without hammering the server on a fixed cadence.
- **Circuit breaker** stops sending traffic once a dependency is clearly
  down, failing fast instead of piling on, and probes for recovery.

## Layout

| File | Responsibility |
|---|---|
| `errors.ts` | Error hierarchy: `ResilienceError`, `TimeoutError`, `CircuitOpenError`, `RetryExhaustedError` |
| `backoff.ts` | `computeBackoffDelay()` — exponential growth, cap, and `none`/`full`/`equal` jitter |
| `timeout.ts` | `withTimeout()` — race an operation against a deadline |
| `circuit-breaker.ts` | `CircuitBreaker` — `closed` / `open` / `half-open` state machine |
| `retry.ts` | `retry()` — the retry loop, with optional per-attempt timeout |
| `resilient.ts` | `ResilientExecutor` — composes retry + breaker into one `execute()` |
| `index.ts` | Public barrel exports |

## Usage

```ts
import { ResilientExecutor } from '@/lib/resilience'

const executor = new ResilientExecutor({
  retry: { retries: 3, timeoutMs: 5_000 },
  circuit: { failureThreshold: 5, openDurationMs: 10_000 },
})

const data = await executor.execute(async () => {
  const res = await fetch('/api/items')
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
})
```

The primitives are also usable on their own — `retry()`, `CircuitBreaker`,
`withTimeout()`, and `computeBackoffDelay()` are all exported.

### Wired-in client

`ItemClient` is the concrete integration. Each of its calls
(`listItems`, `createItem`) runs through a `ResilientExecutor`:

```ts
import { ItemClient } from '@/services/item-client'

const client = new ItemClient()
const items = await client.listItems()
```

Retry policy (`isRetryableError`): retry on `TimeoutError`, network-level
`TypeError`s from `fetch`, and retryable HTTP statuses (`408`, `425`, `429`,
`5xx`). Other `4xx` responses surface immediately as an `HttpError`. An open
circuit is never retried.

## How composition works

`ResilientExecutor.execute()`:

1. If the breaker is **open**, reject up front with `CircuitOpenError`
   (fail fast — no call is made).
2. Otherwise run the operation through the retry loop. Each attempt's
   outcome is recorded on the breaker, so **timeouts count as failures** too.
3. If a failing attempt trips the breaker mid-flight, the remaining retries
   are abandoned and the underlying error surfaces. The breaker is now open,
   so the *next* call short-circuits with `CircuitOpenError`.
4. After the cool-down elapses, the breaker moves to **half-open** and allows
   a trial request; a success closes it, a failure re-opens it.

## Edge cases handled

- **Per-attempt timeout** via `withTimeout`; the timer is always cleared so a
  slow operation cannot leak a pending timeout. Timeouts are retryable.
- **Synchronous throws** inside an operation are caught by the race, not
  leaked past it.
- **Non-retryable errors** are re-thrown as-is (original error preserved);
  **exhausted retries** throw `RetryExhaustedError` wrapping the last error.
- **`retries: 0`** means a single attempt with no retry.
- **Input validation**: negative/non-integer `retries` and `attempt`,
  non-positive `timeoutMs`/`openDurationMs`, and sub-1 breaker thresholds all
  throw `RangeError`.
- **Breaker recovery** through half-open, with a configurable number of trial
  successes required to fully close.
- **Promise cancellation caveat**: JS promises are not cancellable, so a
  timed-out operation keeps running in the background. Pass an `AbortSignal`
  to the underlying I/O (e.g. `fetch`) when you also need to abort it;
  `ItemClient` methods accept one.

## Testability notes

Everything slow or non-deterministic is injectable:

- `backoff` takes a `random` function.
- `CircuitBreaker` takes a `now` clock.
- `retry` / `ResilientExecutor` take a `sleep` function.

Tests use these plus Jest fake timers for the timeout paths, so the suite
runs without real delays. See `tests/resilience/` and `tests/item-client.test.ts`.

## Testing setup

Tests run under Jest with `ts-jest` (`jest.config.js`). ts-jest transpiles
only (`diagnostics: false`) because the repo ships no `@types/jest`; static
type-checking is done separately with `npx tsc --noEmit`. The `@/*` path
alias is mirrored in `moduleNameMapper`.
