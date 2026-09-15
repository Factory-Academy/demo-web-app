import { Item } from '@/models/item'

/**
 * Base constraint for an event map.
 *
 * An event map is an object type whose keys are event names and whose values
 * are the payload types delivered to handlers of that event. Define a map like
 * {@link AppEventMap} and pass it to the emitter for fully typed `on`/`emit`.
 *
 * @example
 * interface MyEvents {
 *   'user:login': { userId: string }
 *   'user:logout': { userId: string; reason: string }
 * }
 */
export type EventMap = Record<string, unknown>

/**
 * A handler invoked with the payload of the event it is subscribed to.
 *
 * @typeParam T - The payload type for the event
 */
export type EventHandler<T> = (payload: T) => void

/**
 * A function returned by {@link IEventEmitter.on} and {@link IEventEmitter.once}
 * that removes the subscription it was created for. Calling it more than once is
 * safe and has no additional effect.
 */
export type Unsubscribe = () => void

/**
 * Callback invoked when a handler throws during {@link IEventEmitter.emit}.
 *
 * Providing this to an emitter keeps a single misbehaving handler from
 * interrupting the others: each error is routed here instead of propagating.
 * If this callback itself throws, that failure does not abort the remaining
 * handlers either; it is surfaced after the dispatch completes.
 *
 * @typeParam TEvents - The emitter's event map
 * @param error - The value thrown by the handler
 * @param event - The name of the event being emitted when the error occurred
 */
export type EventErrorHandler<TEvents extends EventMap> = (
  error: unknown,
  event: keyof TEvents
) => void

/**
 * Options for constructing a typed event emitter.
 *
 * @typeParam TEvents - The emitter's event map
 */
export interface EventEmitterOptions<TEvents extends EventMap> {
  /**
   * Invoked for each handler that throws while an event is being emitted.
   *
   * When omitted, handler failures are buffered until every handler has run and
   * then rethrown: a lone failure is rethrown unchanged, while multiple
   * failures are combined into an `AggregateError` so none are silently
   * swallowed.
   */
  onError?: EventErrorHandler<TEvents>

  /**
   * Soft ceiling on the number of handlers per event. When more than this many
   * handlers are registered for a single event a one-time warning is emitted to
   * help catch subscription leaks. Set to `0` to disable the warning entirely.
   *
   * @defaultValue 10
   */
  maxListeners?: number
}

/**
 * A minimal, strongly typed publish/subscribe contract.
 *
 * Every method is keyed by the event map `TEvents`, so event names and their
 * payloads are checked at compile time and cannot drift apart.
 *
 * @typeParam TEvents - The event map describing the events and their payloads
 */
export interface IEventEmitter<TEvents extends EventMap> {
  /**
   * Subscribe to an event.
   *
   * @param event - The event name to listen for
   * @param handler - Invoked with the event payload each time the event fires
   * @returns A function that removes this subscription when called
   */
  on<K extends keyof TEvents>(
    event: K,
    handler: EventHandler<TEvents[K]>
  ): Unsubscribe

  /**
   * Subscribe to an event for a single delivery. The handler is removed
   * automatically the first time the event fires.
   *
   * @param event - The event name to listen for
   * @param handler - Invoked at most once with the event payload
   * @returns A function that removes this subscription before it fires
   */
  once<K extends keyof TEvents>(
    event: K,
    handler: EventHandler<TEvents[K]>
  ): Unsubscribe

  /**
   * Remove a previously registered handler for an event. If the same handler
   * was registered multiple times, only one registration is removed.
   *
   * @param event - The event name the handler was registered for
   * @param handler - The handler reference to remove
   */
  off<K extends keyof TEvents>(
    event: K,
    handler: EventHandler<TEvents[K]>
  ): void

  /**
   * Synchronously deliver a payload to every handler registered for an event.
   *
   * Every registered handler is always invoked, even if an earlier one throws.
   * Failures are surfaced only after the full dispatch: routed to `onError` when
   * one is configured, otherwise rethrown (a single error unchanged, multiple
   * errors as an `AggregateError`).
   *
   * @param event - The event name to emit
   * @param payload - The payload passed to each handler
   * @returns `true` if at least one handler was invoked, `false` otherwise
   */
  emit<K extends keyof TEvents>(event: K, payload: TEvents[K]): boolean

  /**
   * Remove all handlers for a single event, or for every event when called
   * without an argument.
   *
   * @param event - Optional event name to clear; clears all events when omitted
   */
  removeAllListeners<K extends keyof TEvents>(event?: K): void

  /**
   * Count the handlers currently registered for an event.
   *
   * @param event - The event name to inspect
   * @returns The number of registered handlers
   */
  listenerCount<K extends keyof TEvents>(event: K): number

  /**
   * List the event names that currently have at least one handler.
   *
   * @returns An array of event names with active subscriptions
   */
  eventNames(): Array<keyof TEvents>
}

/**
 * Payload emitted after {@link ItemService.validate} runs, carrying both the
 * validated input and the outcome so listeners can react to failures.
 */
export interface ItemValidatedEvent {
  /** The partial item data that was validated. */
  data: Partial<Item>
  /** Whether the data passed validation. */
  valid: boolean
  /** Human-readable validation errors; empty when {@link valid} is `true`. */
  errors: string[]
}

/**
 * Payload emitted after {@link ItemService.calculatePriority} runs.
 */
export interface ItemPriorityCalculatedEvent {
  /** The item the priority was computed for. */
  item: Item
  /** The resulting priority bucket. */
  priority: 'critical' | 'high' | 'medium' | 'low'
}

/**
 * The application-wide event map.
 *
 * Add an entry here to introduce a new typed event; every emitter and handler
 * that uses this map is then checked against the new name and payload.
 */
export interface AppEventMap extends EventMap {
  /** A new item was persisted. */
  'item:created': Item
  /** An item payload was validated. */
  'item:validated': ItemValidatedEvent
  /** An item's priority was calculated. */
  'item:priority_calculated': ItemPriorityCalculatedEvent
}
