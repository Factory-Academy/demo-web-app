# Typed Event Emitter

A lightweight, dependency-free publish/subscribe module with fully typed events.
Use it to decouple side effects (logging, metrics, notifications) from the code
that triggers them.

## Files

- `src/models/event.ts` — event map, handler/emitter interfaces, domain payloads
- `src/services/event-emitter.ts` — `TypedEventEmitter` and the shared `appEvents` bus

## Defining events

Events live in a single **event map**: an interface whose keys are event names
and whose values are payload types. The application map is `AppEventMap`:

```typescript
export interface AppEventMap extends EventMap {
  'item:created': Item
  'item:validated': ItemValidatedEvent
  'item:priority_calculated': ItemPriorityCalculatedEvent
}
```

Add an entry to introduce a new event. Every `on`/`emit` call is checked against
the map, so the event name and its payload can never drift apart.

## Subscribing and publishing

```typescript
import { appEvents } from '@/services/event-emitter'

// Subscribe. The return value unsubscribes.
const off = appEvents.on('item:created', (item) => {
  console.log('created', item.id)
})

// Publish. Returns true if any handler ran.
appEvents.emit('item:created', item)

// Stop listening.
off()
```

`once` delivers a single event then removes itself:

```typescript
appEvents.once('item:validated', ({ valid, errors }) => {
  if (!valid) console.warn('first validation failed', errors)
})
```

## Delivery guarantees

- **Synchronous and ordered** — handlers run in registration order during `emit`.
- **Snapshot dispatch** — handlers added or removed inside a handler do not
  change the in-progress `emit`; they take effect on the next one.
- **Self-cleaning `once`** — a `once` handler that re-emits its own event will
  not re-trigger itself.

## Error handling

By default a handler that throws does not stop the others: every handler runs,
then the first error is rethrown so failures are never silently swallowed.

Pass `onError` to route errors somewhere instead of rethrowing:

```typescript
import { TypedEventEmitter } from '@/services/event-emitter'
import { AppEventMap } from '@/models/event'

const bus = new TypedEventEmitter<AppEventMap>({
  onError: (error, event) => reportToMetrics(event, error),
})
```

## Leak detection

Registering more than `maxListeners` handlers (default `10`) for one event logs
a one-time warning to help catch missed unsubscriptions. Set `maxListeners: 0`
to disable it.

## Dependency injection

Services accept an `IEventEmitter<AppEventMap>` so tests can supply an isolated
bus instead of the shared singleton:

```typescript
const events = new TypedEventEmitter<AppEventMap>()
const service = new ItemService(undefined, events)
events.on('item:validated', handler)
service.validate({ name: 'Test', status: 'active' })
```

`ItemService` emits `item:validated` from `validate` and
`item:priority_calculated` from `calculatePriority`; the items API route emits
`item:created` after persisting a new item.
