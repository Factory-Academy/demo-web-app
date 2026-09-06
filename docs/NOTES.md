# Typed event emitter

A tiny, dependency-free pub/sub bus with compile-time-checked event names and
payloads. It lives in `src/lib/event-emitter.ts`; domain events for items are
declared in `src/events/item-events.ts`.

## Why

Publishers and subscribers stay decoupled: the API route announces that an item
was created, and anything that cares (metrics, notifications, an audit log) can
listen without the route knowing they exist. Because the event map is a
TypeScript interface, a wrong event name or a mismatched payload fails the
build instead of failing in production.

## Defining events

Describe every event and its payload in one interface, then create an emitter
typed to it (or reuse a shared instance):

```ts
import { EventEmitter } from '@/lib/event-emitter'

interface AppEvents {
  'user:login': { id: string }
  'user:logout': { id: string; reason: 'manual' | 'timeout' }
}

export const bus = new EventEmitter<AppEvents>()
```

## Subscribing

```ts
// `on` returns an unsubscribe handle — call it to stop listening.
const off = bus.on('user:login', ({ id }) => console.log('welcome', id))
off()

// `once` auto-detaches after the first dispatch.
bus.once('user:logout', ({ reason }) => console.log('bye', reason))

// `onAny` observes every event; ideal for logging and metrics.
bus.onAny((event, payload) => track(event, payload))
```

`payload` is fully typed per event, so `bus.on('user:login', p => p.reason)`
is a compile error.

## Publishing

```ts
bus.emit('user:login', { id: '42' })
// emit returns true when the event had at least one typed listener.
```

## Semantics worth knowing

- **Dispatch is synchronous** and follows registration order.
- **A snapshot is taken before dispatch.** Subscribing or unsubscribing from
  inside a handler never affects the emit already in flight; it applies to the
  next one.
- **Listener errors are isolated.** If a handler throws, the remaining handlers
  still run and the error is routed to the `onError` option (default:
  `console.error`). Pass your own handler to silence or report:
  `new EventEmitter<AppEvents>({ onError: report })`.
- **Duplicates are allowed.** Adding the same function twice fires it twice;
  `off` and the unsubscribe handle each remove one registration.

Housekeeping helpers: `off`, `offAny`, `removeAllListeners(event?)`,
`listenerCount(event)`, and `eventNames()`.

## How it's wired into the item flow

`ItemService` (`src/services/item-service.ts`) takes an emitter (defaulting to
the shared `itemEvents` bus) and publishes:

| Event | Emitted when |
|---|---|
| `item:validation_failed` | `validate()` finds problems |
| `item:created` | `registerCreated()` records a new item, with its derived priority |
| `item:updated` | `applyUpdate()` applies changes |
| `item:priority_changed` | an update moves the computed priority |

`POST /api/items` (`src/app/api/items/route.ts`) validates input, rejects it
with a 400 on failure, and otherwise emits `item:created` through the service.
`ItemActivityLog` (`src/events/item-activity-log.ts`) shows the subscriber side:
it uses `onAny` to keep an in-memory audit trail, fully decoupled from the
publisher.

Tests: `tests/event-emitter.test.ts` (the core) and `tests/item-events.test.ts`
(the domain integration and the activity log).
