# Rate limiter notes

A small, dependency-free token-bucket rate limiter lives in
`src/lib/rate-limiter/`. It bounds how often a client can hit write-heavy API
paths without pulling in an external service.

## Why a token bucket

A token bucket allows short bursts (up to `capacity`) while enforcing a steady
average rate (`refillTokens` per `refillIntervalMs`). This fits API traffic:
clients can make a quick series of calls, then are throttled back to the
sustained rate. It is simpler and cheaper than a sliding-window log and needs no
background timers.

## Pieces

| File | Responsibility |
|---|---|
| `types.ts` | Shared interfaces (`TokenBucketOptions`, `RateLimitResult`, `RateLimiter`). |
| `token-bucket.ts` | `TokenBucket`: a single lazily-refilling bucket. |
| `keyed-rate-limiter.ts` | `KeyedRateLimiter`: one bucket per key (client/IP), with idle + LRU eviction. |
| `http.ts` | Request helpers: derive a client key and build `X-RateLimit-*` / `Retry-After` headers. |
| `index.ts` | Public barrel export. |

## How refill works

Tokens accrue continuously at `refillTokens / refillIntervalMs` per
millisecond. Instead of a timer, each `tryConsume` / `peek` call computes the
tokens earned since the last touch from the elapsed wall-clock time and caps the
total at `capacity`. The clock is injectable (`now`) so tests are deterministic
and there is no reliance on real time.

## Usage

```ts
import { KeyedRateLimiter } from '@/lib/rate-limiter'

const limiter = new KeyedRateLimiter({
  capacity: 5,          // burst size
  refillTokens: 1,      // sustained rate ...
  refillIntervalMs: 1000, // ... 1 token per second
  maxIdleMs: 10 * 60 * 1000, // evict buckets idle > 10 min
  maxKeys: 10_000,      // hard cap on tracked keys (LRU eviction)
})

const result = limiter.check(clientKey)
if (!result.allowed) {
  // reject with 429 and result.retryAfterMs
}
```

## Integration

`src/app/api/items/route.ts` rate-limits `POST` per client. The client key is
derived from `x-forwarded-for` (first hop), then `x-real-ip`, then a shared
`anonymous` bucket so a missing header never bypasses limiting. When the budget
is exhausted the route returns `429` with a `Retry-After` header; successful
responses carry the current `X-RateLimit-*` headers.

## Edge cases handled

- Invalid config (non-positive or non-finite `capacity`, `refillTokens`,
  `refillIntervalMs`; negative `initialTokens`) throws `RangeError` at
  construction.
- Requests larger than `capacity` can never succeed and return
  `retryAfterMs = Infinity` rather than looping.
- Non-positive token counts on `tryConsume` throw `RangeError`.
- A non-monotonic clock (NTP adjustment, clock jumping backwards) never grants
  tokens for negative elapsed time; the reference still moves forward.
- Fractional tokens accumulate across calls; `remaining` is reported floored.
- `KeyedRateLimiter` keeps memory bounded via idle eviction (`maxIdleMs`) and an
  LRU cap (`maxKeys`); an evicted key transparently starts with a fresh bucket.

## Tests

- `tests/rate-limiter/token-bucket.test.ts` - construction validation,
  consumption, continuous refill, capacity clamping, clock safety, metadata.
- `tests/rate-limiter/keyed-rate-limiter.test.ts` - per-key isolation, idle
  eviction, LRU eviction, reset.
- `tests/rate-limiter/http.test.ts` - client-key derivation and header shaping.

Tests inject a fake clock, so they are deterministic and do not depend on real
elapsed time.
