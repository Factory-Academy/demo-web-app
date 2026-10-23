import { ListenerInvocationError, WaitAbortedError, WaitTimeoutError } from './errors'
import {
  EmitterOptions,
  EventKey,
  EventMap,
  EventPayload,
  Listener,
  ListenerErrorHandler,
  SubscribeOptions,
  Unsubscribe,
  WaitForOptions,
} from './types'

/** Internal record for one subscription. */
interface Registration<Payload> {
  listener: Listener<Payload>
  once: boolean
}

const DEFAULT_MAX_LISTENERS = 10

/**
 * A tiny, dependency-free, strongly-typed pub/sub emitter.
 *
 * Parameterize it with an {@link EventMap} to get compile-time event names and
 * payloads:
 *
 * ```ts
 * interface Events { ping: { at: number }; done: void }
 * const bus = new TypedEventEmitter<Events>()
 * const off = bus.on('ping', ({ at }) => console.log(at)) // `at` is number
 * bus.emit('ping', { at: Date.now() })
 * off()
 * ```
 *
 * Dispatch is synchronous and re-entrancy safe: `emit` iterates a snapshot of
 * the listeners, so subscribing or unsubscribing from inside a listener never
 * disturbs the in-flight dispatch. Listeners added during an emit run on the
 * next emit; listeners removed during an emit are skipped if not yet called.
 */
export class TypedEventEmitter<Events extends EventMap> {
  private readonly registry = new Map<EventKey<Events>, Set<Registration<unknown>>>()
  private readonly onError?: ListenerErrorHandler
  private readonly onWarning: (message: string) => void
  private maxListeners: number

  constructor(options: EmitterOptions = {}) {
    this.maxListeners = normalizeMaxListeners(options.maxListeners ?? DEFAULT_MAX_LISTENERS)
    this.onError = options.onError
    this.onWarning =
      options.onWarning ??
      ((message) => {
        // eslint-disable-next-line no-console
        console.warn(message)
      })
  }

  /**
   * Subscribe to an event. Returns an {@link Unsubscribe} that detaches this
   * exact subscription (adding the same function twice yields two independent
   * subscriptions, each removable on its own).
   */
  on<K extends EventKey<Events>>(
    event: K,
    listener: Listener<EventPayload<Events, K>>,
    options?: SubscribeOptions,
  ): Unsubscribe {
    return this.add(event, listener, false, options)
  }

  /**
   * Subscribe for a single delivery. The listener is removed immediately
   * before it is invoked, so it never fires twice even if the event is
   * re-emitted re-entrantly from within the listener itself.
   */
  once<K extends EventKey<Events>>(
    event: K,
    listener: Listener<EventPayload<Events, K>>,
    options?: SubscribeOptions,
  ): Unsubscribe {
    return this.add(event, listener, true, options)
  }

  /**
   * Remove every registration of `listener` for `event`, regardless of whether
   * it was added via `on` or `once`. Removing a listener that was never added
   * is a no-op.
   */
  off<K extends EventKey<Events>>(
    event: K,
    listener: Listener<EventPayload<Events, K>>,
  ): void {
    const regs = this.registry.get(event)
    if (!regs) return
    for (const reg of Array.from(regs)) {
      if (reg.listener === listener) regs.delete(reg)
    }
    if (regs.size === 0) this.registry.delete(event)
  }

  /**
   * Deliver `payload` to every listener of `event`, in subscription order.
   * Returns `true` if at least one listener was registered, `false` otherwise.
   *
   * A throwing listener never stops the others: if an `onError` handler is
   * configured each error is routed there; otherwise the first error is
   * rethrown (wrapped in {@link ListenerInvocationError}) after all listeners
   * have run.
   */
  emit<K extends EventKey<Events>>(event: K, payload: EventPayload<Events, K>): boolean {
    const regs = this.registry.get(event)
    if (!regs || regs.size === 0) return false

    // Snapshot so re-entrant subscribe/unsubscribe cannot disturb this pass.
    const snapshot = Array.from(regs)
    let firstError: { error: unknown } | undefined

    for (const reg of snapshot) {
      // Skip listeners a prior listener removed during this same emit. `once`
      // listeners were already removed by us, so re-check only survives here.
      if (!reg.once && !regs.has(reg)) continue
      if (reg.once) regs.delete(reg)

      try {
        reg.listener(payload)
      } catch (error) {
        if (this.onError) {
          this.onError(error, { event, payload })
        } else if (!firstError) {
          firstError = { error }
        }
      }
    }

    if (regs.size === 0) this.registry.delete(event)

    if (firstError) {
      throw new ListenerInvocationError(event, firstError.error)
    }
    return true
  }

  /** Number of listeners currently registered for `event`. */
  listenerCount<K extends EventKey<Events>>(event: K): number {
    return this.registry.get(event)?.size ?? 0
  }

  /** Snapshot of the listener functions registered for `event`. */
  listeners<K extends EventKey<Events>>(event: K): Listener<EventPayload<Events, K>>[] {
    const regs = this.registry.get(event)
    if (!regs) return []
    return Array.from(regs, (reg) => reg.listener as Listener<EventPayload<Events, K>>)
  }

  /** Names of every event that currently has at least one listener. */
  eventNames(): EventKey<Events>[] {
    return Array.from(this.registry.keys())
  }

  /** Remove all listeners for one event, or for every event when omitted. */
  removeAllListeners<K extends EventKey<Events>>(event?: K): void {
    if (event === undefined) {
      this.registry.clear()
      return
    }
    this.registry.delete(event)
  }

  /**
   * Resolve with the next payload for `event`. Supports an optional abort
   * signal and timeout; whichever settles first wins and the temporary
   * listener is always cleaned up.
   */
  waitFor<K extends EventKey<Events>>(
    event: K,
    options: WaitForOptions = {},
  ): Promise<EventPayload<Events, K>> {
    const { signal, timeoutMs } = options
    return new Promise<EventPayload<Events, K>>((resolve, reject) => {
      if (signal?.aborted) {
        reject(new WaitAbortedError(event))
        return
      }

      let settled = false
      let timer: ReturnType<typeof setTimeout> | undefined

      const cleanup = () => {
        unsubscribe()
        if (timer !== undefined) clearTimeout(timer)
        if (signal) signal.removeEventListener('abort', onAbort)
      }

      const settle = (fn: () => void) => {
        if (settled) return
        settled = true
        cleanup()
        fn()
      }

      const onAbort = () => settle(() => reject(new WaitAbortedError(event)))

      const unsubscribe = this.once(event, (payload) => {
        settle(() => resolve(payload))
      })

      if (signal) signal.addEventListener('abort', onAbort)

      if (timeoutMs !== undefined) {
        if (!(timeoutMs > 0)) {
          settled = true
          cleanup()
          reject(new RangeError(`timeoutMs must be > 0, got ${timeoutMs}`))
          return
        }
        timer = setTimeout(() => {
          settle(() => reject(new WaitTimeoutError(event, timeoutMs)))
        }, timeoutMs)
      }
    })
  }

  /** Current soft cap on listeners per event. */
  getMaxListeners(): number {
    return this.maxListeners
  }

  /** Update the soft cap. `0` disables the warning. Must be a non-negative integer. */
  setMaxListeners(max: number): void {
    this.maxListeners = normalizeMaxListeners(max)
  }

  private add<K extends EventKey<Events>>(
    event: K,
    listener: Listener<EventPayload<Events, K>>,
    once: boolean,
    options?: SubscribeOptions,
  ): Unsubscribe {
    const signal = options?.signal
    if (signal?.aborted) {
      return () => {}
    }

    let regs = this.registry.get(event)
    if (!regs) {
      regs = new Set()
      this.registry.set(event, regs)
    }

    const reg: Registration<unknown> = {
      listener: listener as Listener<unknown>,
      once,
    }
    regs.add(reg)

    if (this.maxListeners > 0 && regs.size > this.maxListeners) {
      this.onWarning(
        `Possible event-emitter leak: ${regs.size} listeners added for "${event}" ` +
          `(limit ${this.maxListeners}). Use setMaxListeners() to raise the cap.`,
      )
    }

    let onAbort: (() => void) | undefined
    const unsubscribe: Unsubscribe = () => {
      const current = this.registry.get(event)
      if (current) {
        current.delete(reg)
        if (current.size === 0) this.registry.delete(event)
      }
      if (signal && onAbort) signal.removeEventListener('abort', onAbort)
    }

    if (signal) {
      onAbort = unsubscribe
      signal.addEventListener('abort', onAbort)
    }

    return unsubscribe
  }
}

function normalizeMaxListeners(max: number): number {
  if (!Number.isInteger(max) || max < 0) {
    throw new RangeError(`maxListeners must be a non-negative integer, got ${max}`)
  }
  return max
}
