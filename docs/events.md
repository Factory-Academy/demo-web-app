# Typed event-emitter

A small, dependency-free pub/sub with compile-time-checked event names and
payloads. It lives in `src/lib/events/` and is wired into the items HTTP client
(`src/services/item-client.ts`) to expose its request lifecycle.

> Note: the resilience module's notes are in `docs/NOTES.md`; this file covers
> the event-emitter added alongside it.

## Why

Code that produces interesting moments (a request started, retried, failed)
should not need to know who is listening — a logger, a metrics counter, a UI
spinner. A typed emitter decouples the producer from those consumers while
keeping every event name and payload checked by the compiler.

## Layout

| File | Responsibility |
|---|---|
| `types.ts` | Public types: `EventMap`, `Listener`, `Unsubscribe`, option/context types |
| `errors.ts` | Error hierarchy: `EmitterError`, `ListenerInvocationError`, `WaitAbortedError`, `WaitTimeoutError` |
| `event-emitter.ts` | `TypedEventEmitter` — the emitter itself |
| `index.ts` | Public barrel exports |

## Usage

Declare an event map (keys are event names, values are payload types), then
construct an emitter over it:

```ts
import { TypedEventEmitter } from '@/lib/events'

interface Events {
  opened: { id: string }
  message: string
  closed: void
}

const bus = new TypedEventEmitter<Events>()

const off = bus.on('message', (text) => console.log(text)) // `text` is string
bus.emit('message', 'hello')  // ✅  'hello' is a string
// bus.emit('message', 123)   // ❌  compile error: number is not string
off()                          // detach this listener
```

### API

- `on(event, listener, options?)` → `Unsubscribe`. Subscribe; the returned
  function detaches this exact subscription.
- `once(event, listener, options?)` → `Unsubscribe`. Fire at most once; removed
  before it runs, so a re-entrant re-emit cannot invoke it twice.
- `off(event, listener)` — remove every registration of that function.
- `emit(event, payload)` → `boolean`. Deliver synchronously, in subscription
  order; returns whether any listener was registered.
- `listenerCount(event)`, `listeners(event)`, `eventNames()` — introspection.
- `removeAllListeners(event?)` — clear one event or all events.
- `waitFor(event, { signal?, timeoutMs? })` → `Promise<payload>`. Resolve on
  the next emit; optionally abortable and/or time-limited.
- `setMaxListeners(n)` / `getMaxListeners()` — the leak-warning threshold.

`on` / `once` accept `{ signal }`: pass an `AbortSignal` and the listener is
removed when the signal aborts (an already-aborted signal attaches nothing).

### Wired-in client

`ItemClient` exposes its request lifecycle through `client.events`:

```ts
import { ItemClient } from '@/services/item-client'

const client = new ItemClient()
client.events.on('request:retry', ({ url, attempt }) =>
  console.warn(`retry #${attempt} for ${url}`),
)
client.events.on('request:error', ({ url, error }) =>
  console.error(`failed ${url}`, error),
)

await client.listItems()
```

Each logical request emits one `request:start`, then zero or more
`request:retry` (one per re-attempt, driven by the resilient executor's attempt
index), then exactly one terminal `request:success` or `request:error`. Pass
`new ItemClient({ events })` to share one bus across several clients.

## Edge cases handled

- **Re-entrancy safety**: `emit` iterates a snapshot, so subscribing or
  unsubscribing from inside a listener never disturbs the in-flight dispatch.
  A listener added during an emit runs on the *next* emit; one removed during
  an emit is skipped if it had not yet been called.
- **Listener isolation**: a throwing listener never stops the others. With an
  `onError` handler the error is routed there (with `{ event, payload }`
  context); without one, the first error is rethrown wrapped in
  `ListenerInvocationError` after all listeners have run.
- **Duplicate subscriptions**: the same function added twice fires twice, and
  each `on`/`once` handle removes only its own registration.
- **Leak warning**: more than `maxListeners` (default 10) listeners on one
  event triggers a warning via `onWarning` (defaults to `console.warn`); set
  `0` to disable.
- **`waitFor` cleanup**: whichever of resolve / abort / timeout settles first
  wins, and the temporary listener and timer are always torn down.
- **Validation**: a non-integer or negative `maxListeners` throws `RangeError`;
  a non-positive `waitFor` `timeoutMs` rejects with `RangeError`.

## Testing setup

Tests run under Jest with `ts-jest` (`jest.config.js`), the same setup as the
rest of the repo: ts-jest transpiles only (`diagnostics: false`), and static
type-checking is done separately with `npx tsc --noEmit`. The `waitFor` timeout
paths use Jest fake timers so the suite runs without real delays. See
`tests/events/event-emitter.test.ts` and `tests/item-client-events.test.ts`.
