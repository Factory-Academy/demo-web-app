import {
  AppEventMap,
  EventEmitterOptions,
  EventHandler,
  EventMap,
  IEventEmitter,
  Unsubscribe,
} from '@/models/event'

/** Default per-event handler ceiling before a leak warning is emitted. */
const DEFAULT_MAX_LISTENERS = 10

/**
 * A lightweight, synchronous, strongly typed event emitter.
 *
 * The emitter is generic over an {@link EventMap}, so subscribing to or
 * emitting an unknown event, or passing the wrong payload shape, is a compile
 * error. It has no runtime dependencies and works in both the browser and Node.
 *
 * Delivery is synchronous and ordered: handlers run in the order they were
 * registered. Handlers added or removed during an emit do not affect the
 * in-progress dispatch, because the handler list is snapshotted before it runs.
 *
 * @typeParam TEvents - The event map describing events and their payloads
 *
 * @example
 * interface Events {
 *   'ping': { at: number }
 * }
 *
 * const bus = new TypedEventEmitter<Events>()
 * const off = bus.on('ping', ({ at }) => console.log('ping at', at))
 * bus.emit('ping', { at: Date.now() })
 * off() // stop listening
 */
export class TypedEventEmitter<TEvents extends EventMap>
  implements IEventEmitter<TEvents>
{
  private readonly handlers: Map<
    keyof TEvents,
    Array<EventHandler<TEvents[keyof TEvents]>>
  > = new Map()

  private readonly options: Required<
    Pick<EventEmitterOptions<TEvents>, 'maxListeners'>
  > &
    Pick<EventEmitterOptions<TEvents>, 'onError'>

  private readonly warnedEvents: Set<keyof TEvents> = new Set()

  /**
   * @param options - Optional error routing and leak-detection configuration
   */
  constructor(options: EventEmitterOptions<TEvents> = {}) {
    this.options = {
      maxListeners: options.maxListeners ?? DEFAULT_MAX_LISTENERS,
      onError: options.onError,
    }
  }

  on<K extends keyof TEvents>(
    event: K,
    handler: EventHandler<TEvents[K]>
  ): Unsubscribe {
    const list = this.handlers.get(event)
    const bucket = (list ?? []) as Array<EventHandler<TEvents[K]>>
    bucket.push(handler)
    this.handlers.set(
      event,
      bucket as Array<EventHandler<TEvents[keyof TEvents]>>
    )

    this.warnIfLeaking(event, bucket.length)

    let active = true
    return () => {
      // Guard against double-unsubscribe removing an unrelated later handler.
      if (!active) return
      active = false
      this.off(event, handler)
    }
  }

  once<K extends keyof TEvents>(
    event: K,
    handler: EventHandler<TEvents[K]>
  ): Unsubscribe {
    // The wrapper unsubscribes itself before invoking the target handler so a
    // handler that re-emits the same event cannot re-trigger this once-handler.
    const wrapper: EventHandler<TEvents[K]> = (payload) => {
      this.off(event, wrapper)
      handler(payload)
    }
    return this.on(event, wrapper)
  }

  off<K extends keyof TEvents>(
    event: K,
    handler: EventHandler<TEvents[K]>
  ): void {
    const bucket = this.handlers.get(event)
    if (!bucket) return

    const index = bucket.indexOf(
      handler as EventHandler<TEvents[keyof TEvents]>
    )
    if (index === -1) return

    bucket.splice(index, 1)
    if (bucket.length === 0) {
      this.handlers.delete(event)
      this.warnedEvents.delete(event)
    }
  }

  emit<K extends keyof TEvents>(event: K, payload: TEvents[K]): boolean {
    const bucket = this.handlers.get(event)
    if (!bucket || bucket.length === 0) return false

    // Snapshot so mutations during dispatch (off/on/once) don't skip or
    // double-invoke handlers mid-loop.
    const snapshot = bucket.slice() as Array<EventHandler<TEvents[K]>>
    const errors: unknown[] = []

    for (const handler of snapshot) {
      try {
        handler(payload)
      } catch (error) {
        this.captureError(error, event, errors)
      }
    }

    // Every handler always runs; any failures are surfaced only after the full
    // dispatch, so a single throwing handler can never suppress the others.
    this.surfaceErrors(errors)

    return true
  }

  removeAllListeners<K extends keyof TEvents>(event?: K): void {
    if (event === undefined) {
      this.handlers.clear()
      this.warnedEvents.clear()
      return
    }
    this.handlers.delete(event)
    this.warnedEvents.delete(event)
  }

  listenerCount<K extends keyof TEvents>(event: K): number {
    return this.handlers.get(event)?.length ?? 0
  }

  eventNames(): Array<keyof TEvents> {
    return Array.from(this.handlers.keys())
  }

  /**
   * Route a handler failure during {@link emit}. With an `onError` sink the
   * error is handed to it; without one it is buffered to be surfaced after the
   * dispatch completes. A sink that throws is itself buffered rather than
   * allowed to abort the remaining handlers.
   */
  private captureError(
    error: unknown,
    event: keyof TEvents,
    sink: unknown[]
  ): void {
    if (!this.options.onError) {
      sink.push(error)
      return
    }
    try {
      this.options.onError(error, event)
    } catch (onErrorFailure) {
      sink.push(onErrorFailure)
    }
  }

  /**
   * Rethrow buffered dispatch failures once every handler has run. A single
   * failure is rethrown unchanged so its type and stack are preserved; multiple
   * failures are wrapped in an {@link AggregateError} so none are lost.
   */
  private surfaceErrors(errors: unknown[]): void {
    if (errors.length === 0) return
    if (errors.length === 1) throw errors[0]
    throw new AggregateError(
      errors,
      `${errors.length} handlers threw during emit`
    )
  }

  private warnIfLeaking(event: keyof TEvents, count: number): void {
    const max = this.options.maxListeners
    if (max <= 0 || count <= max || this.warnedEvents.has(event)) return

    this.warnedEvents.add(event)
    // eslint-disable-next-line no-console
    console.warn(
      `[TypedEventEmitter] Possible listener leak: ${count} handlers ` +
        `registered for "${String(event)}" (max ${max}). ` +
        `Did you forget to unsubscribe?`
    )
  }
}

/**
 * Shared application event bus, typed against {@link AppEventMap}.
 *
 * Import this to publish or subscribe to cross-cutting domain events without
 * wiring an emitter through every constructor.
 *
 * @example
 * import { appEvents } from '@/services/event-emitter'
 *
 * appEvents.on('item:created', (item) => {
 *   console.log('created', item.id)
 * })
 */
export const appEvents: TypedEventEmitter<AppEventMap> =
  new TypedEventEmitter<AppEventMap>()
