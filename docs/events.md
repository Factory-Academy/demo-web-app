# Typed event emitter

A small, dependency-free pub/sub emitter with full payload typing. It lives in
`src/lib/events/` and is wired into the items HTTP client
(`src/services/item-client.ts`) for request-lifecycle observability.

> The resilience toolkit has its own notes in [`NOTES.md`](./NOTES.md); this
> file is the per-topic doc for the event emitter.

## Why

Parts of the app need to react to things that happen elsewhere (a request
started, an item was created) without the producer and consumer knowing about
each other. A typed emitter gives that decoupling while keeping event names and
payloads checked at compile time, so a renamed event or a wrong payload is a
build error rather than a silent bug.

## Layout

| File | Responsibility |
|---|---|
| `types.ts` | `EventMap`, `EventName`, `Listener`, `Unsubscribe`, `EmitterOptions` |
| `errors.ts` | `EmitterError`, `ListenerDispatchError` (listener-error aggregate) |
| `emitter.ts` | `TypedEmitter` — `on` / `once` / `off` / `emit` / `waitFor` + introspection |
| `index.ts` | Public barrel exports |

## Usage

Define an event map (name → payload) and create an emitter:

```ts
import { TypedEmitter } from '@/lib/events'

interface AppEvents {
  'user:login': { id: string }
  'cart:cleared': void
}

const bus = new TypedEmitter<AppEvents>()

const off = bus.on('user:login', (u) => console.log(u.id)) // u is { id: string }
bus.emit('user:login', { id: 'u1' })                        // payload type-checked
off()                                                       // unsubscribe

// bus.emit('user:login', { name: 'x' }) // compile error: wrong payload
// bus.on('user:logout', () => {})       // compile error: unknown event
```

`on` and `once` return an idempotent `Unsubscribe` handle. `waitFor` turns the
next occurrence into a promise:

```ts
const { id } = await bus.waitFor('user:login')
```

### Wired-in client

`ItemClient` exposes a `TypedEmitter<ItemClientEvents>` as `client.events`. Each
call emits one `request` up front and then exactly one terminal `success` or
`error`, no matter how many times the resilient executor retries internally.
`createItem` additionally emits `created` with the new item.

```ts
import { ItemClient } from '@/services/item-client'

const client = new ItemClient()
client.events.on('request', ({ method, url }) => console.log(method, url))
client.events.on('created', (item) => console.log('created', item.id))

await client.listItems() // → request, success
```

Events: `request` / `success` carry `{ method, url }`; `error` adds the
underlying `error`; `created` carries the `Item`.

## Edge cases handled

- **Mutation during dispatch** — `emit` iterates a snapshot, so listeners added
  or removed by a running listener do not change who is notified for the
  in-flight event. Added listeners fire on the next emit.
- **`once` re-entrancy** — a `once` listener is detached *before* it runs, so
  re-emitting the same event from inside it does not re-trigger it.
- **Repeated subscriptions** — subscribing the same function twice creates two
  independent subscriptions (matching Node). Each `on` handle removes only its
  own; `off(event, fn)` removes the first match.
- **Throwing listeners** — one bad listener never stops the others. With an
  `onError` handler, errors are routed there and `emit` resolves cleanly;
  without one, a single error re-throws as-is and multiple are wrapped in a
  `ListenerDispatchError` (`.errors`). `ItemClient` supplies a swallowing
  `onError` so instrumentation can never break a request.
- **Leak guard** — exceeding `maxListeners` (default 10, `0` disables) calls the
  injectable `onWarning` sink; listeners are never dropped.
- **Validation** — a non-function listener throws `TypeError`; a negative or
  non-integer `maxListeners` throws `RangeError`.

## Testability notes

Everything observable is injectable: `onError` for listener failures, and
`onWarning` for leak warnings (so tests assert on a spy instead of noisy
`console.warn`). The suite needs no timers or network. See
`tests/events/emitter.test.ts` and `tests/item-client-events.test.ts`.
