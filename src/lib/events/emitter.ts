/**
 * A small, dependency-free, strongly-typed pub/sub emitter.
 *
 * It mirrors the familiar `on` / `once` / `off` / `emit` shape of Node's
 * `EventEmitter` but adds full payload typing via an {@link EventMap}, returns
 * an {@link Unsubscribe} handle from subscriptions, and makes dispatch robust
 * against the two classic foot-guns: listeners that mutate the listener list
 * while an event is being delivered, and listeners that throw.
 */

import { ListenerDispatchError } from './errors'
import {
  DEFAULT_MAX_LISTENERS,
  EmitterOptions,
  EventMap,
  EventName,
  Listener,
  Unsubscribe,
} from './types'

/** Internal record so a `once` listener can be found and removed by its fn. */
interface Registration<T> {
  listener: Listener<T>
  once: boolean
}

export class TypedEmitter<Events extends EventMap> {
  // Insertion order is preserved so listeners fire in the order registered.
  private readonly registry = new Map<
    EventName<Events>,
    Array<Registration<unknown>>
  >()

  private readonly maxListeners: number
  private readonly onError?: EmitterOptions<Events>['onError']
  private readonly onWarning: (message: string) => void

  constructor(options: EmitterOptions<Events> = {}) {
    const max = options.maxListeners ?? DEFAULT_MAX_LISTENERS
    if (!Number.isInteger(max) || max < 0) {
      throw new RangeError(
        `maxListeners must be a non-negative integer, got ${max}`,
      )
    }
    this.maxListeners = max
    this.onError = options.onError
    this.onWarning =
      options.onWarning ?? ((message) => console.warn(message))
  }

  /**
   * Subscribe to `event`. Returns a handle that removes this exact listener;
   * the handle is idempotent. Registering the same function twice adds two
   * independent subscriptions (matching Node), and each must be removed
   * separately.
   */
  on<K extends EventName<Events>>(
    event: K,
    listener: Listener<Events[K]>,
  ): Unsubscribe {
    return this.add(event, listener, false)
  }

  /**
   * Subscribe to the next occurrence of `event` only. The listener is removed
   * immediately before it is invoked, so re-entrant emits of the same event
   * from within the listener do not re-trigger it.
   */
  once<K extends EventName<Events>>(
    event: K,
    listener: Listener<Events[K]>,
  ): Unsubscribe {
    return this.add(event, listener, true)
  }

  /**
   * Remove the first registration matching `listener` for `event`. A no-op if
   * the listener was never attached (or was already removed).
   */
  off<K extends EventName<Events>>(
    event: K,
    listener: Listener<Events[K]>,
  ): void {
    const regs = this.registry.get(event)
    if (!regs) return
    const index = regs.findIndex((r) => r.listener === listener)
    if (index === -1) return
    regs.splice(index, 1)
    if (regs.length === 0) this.registry.delete(event)
  }

  /**
   * Deliver `payload` to every listener of `event`, in registration order.
   *
   * Dispatch iterates over a snapshot taken up front, so listeners added or
   * removed during delivery do not change who is notified for *this* emit.
   *
   * Error handling: a throwing listener never prevents the remaining ones
   * from running. If an `onError` handler was configured it receives each
   * error and `emit` always resolves cleanly. Otherwise the errors propagate
   * to the `emit` caller — a single error is re-thrown as-is, and multiple
   * are wrapped in a {@link ListenerDispatchError}.
   *
   * @returns the number of listeners that were invoked.
   */
  emit<K extends EventName<Events>>(event: K, payload: Events[K]): number {
    const regs = this.registry.get(event)
    if (!regs || regs.length === 0) return 0

    // Snapshot before invoking so mutation during dispatch is well-defined.
    const snapshot = regs.slice()
    const errors: unknown[] = []

    for (const reg of snapshot) {
      // Detach `once` listeners from the live list *before* calling, so a
      // re-entrant emit from inside the listener will not see it again.
      if (reg.once) {
        const index = regs.indexOf(reg)
        if (index !== -1) {
          regs.splice(index, 1)
          if (regs.length === 0) this.registry.delete(event)
        }
      }

      try {
        reg.listener(payload)
      } catch (error) {
        if (this.onError) this.onError(error, event, payload)
        else errors.push(error)
      }
    }

    if (errors.length === 1) throw errors[0]
    if (errors.length > 1) throw new ListenerDispatchError(event, errors)

    return snapshot.length
  }

  /**
   * Resolve on the next emission of `event` with its payload. A convenience
   * for `await`-ing a single event in async flows; built on {@link once}, so
   * it never fires more than once.
   */
  waitFor<K extends EventName<Events>>(event: K): Promise<Events[K]> {
    return new Promise((resolve) => {
      this.once(event, resolve as Listener<Events[K]>)
    })
  }

  /** Remove every listener for `event`, or for all events when omitted. */
  removeAllListeners(event?: EventName<Events>): void {
    if (event === undefined) this.registry.clear()
    else this.registry.delete(event)
  }

  /** Number of listeners currently attached to `event`. */
  listenerCount(event: EventName<Events>): number {
    return this.registry.get(event)?.length ?? 0
  }

  /** A copy of the listeners attached to `event`, in registration order. */
  listeners<K extends EventName<Events>>(event: K): Array<Listener<Events[K]>> {
    const regs = this.registry.get(event)
    if (!regs) return []
    return regs.map((r) => r.listener as Listener<Events[K]>)
  }

  /** The event names that currently have at least one listener. */
  eventNames(): Array<EventName<Events>> {
    return Array.from(this.registry.keys())
  }

  private add<K extends EventName<Events>>(
    event: K,
    listener: Listener<Events[K]>,
    once: boolean,
  ): Unsubscribe {
    if (typeof listener !== 'function') {
      throw new TypeError('listener must be a function')
    }

    let regs = this.registry.get(event)
    if (!regs) {
      regs = []
      this.registry.set(event, regs)
    }

    const registration: Registration<unknown> = {
      listener: listener as Listener<unknown>,
      once,
    }
    regs.push(registration)

    if (this.maxListeners > 0 && regs.length > this.maxListeners) {
      this.onWarning(
        `Possible event emitter leak: ${regs.length} listeners added for ` +
          `"${event}" (max ${this.maxListeners}).`,
      )
    }

    // The handle removes this exact registration, not merely the first
    // listener that compares equal — important when the same function is
    // subscribed multiple times.
    let removed = false
    return () => {
      if (removed) return
      removed = true
      const current = this.registry.get(event)
      if (!current) return
      const index = current.indexOf(registration)
      if (index !== -1) {
        current.splice(index, 1)
        if (current.length === 0) this.registry.delete(event)
      }
    }
  }
}

/** Convenience factory mirroring `createResilientExecutor` in the sibling module. */
export function createEmitter<Events extends EventMap>(
  options?: EmitterOptions<Events>,
): TypedEmitter<Events> {
  return new TypedEmitter<Events>(options)
}
