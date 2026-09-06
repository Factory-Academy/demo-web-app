/**
 * Lightweight, dependency-free typed pub/sub emitter.
 *
 * An event map describes every event name the emitter understands and the
 * shape of the payload each one carries, so `on`/`emit` are checked at compile
 * time and a typo or a mismatched payload is a build error rather than a
 * runtime surprise.
 *
 *   interface Events { 'user:login': { id: string } }
 *   const bus = new EventEmitter<Events>()
 *   bus.on('user:login', ({ id }) => console.log(id))
 *   bus.emit('user:login', { id: '42' })
 */

export type EventMap = Record<string, unknown>

export type Listener<T> = (payload: T) => void

/** Observer that receives every event, used for logging and metrics. */
export type AnyListener<M extends EventMap> = <K extends keyof M>(
  event: K,
  payload: M[K],
) => void

/** Called when a listener throws, so one bad subscriber cannot break a dispatch. */
export type ErrorHandler<M extends EventMap> = (
  error: unknown,
  event: keyof M,
) => void

/** Removes the subscription it was returned from. Safe to call more than once. */
export type Unsubscribe = () => void

export interface EmitterOptions<M extends EventMap> {
  /**
   * Invoked with any error thrown by a listener. Defaults to `console.error`.
   * Provide a no-op to silence, or a reporter to forward to telemetry.
   */
  onError?: ErrorHandler<M>
}

interface Registration<T> {
  listener: Listener<T>
  once: boolean
}

export class EventEmitter<M extends EventMap> {
  private readonly registry = new Map<keyof M, Array<Registration<unknown>>>()
  private readonly anyListeners: Array<AnyListener<M>> = []
  private readonly onError: ErrorHandler<M>

  constructor(options: EmitterOptions<M> = {}) {
    this.onError =
      options.onError ??
      ((error, event) => {
        // Keep the surviving listeners running; surface the failure loudly.
        console.error(`[EventEmitter] listener for "${String(event)}" threw`, error)
      })
  }

  /**
   * Subscribe to an event. Returns a function that removes this exact
   * subscription. The same listener may be added more than once; each
   * registration is independent and must be removed individually.
   */
  on<K extends keyof M>(event: K, listener: Listener<M[K]>): Unsubscribe {
    return this.add(event, listener, false)
  }

  /** Subscribe for a single dispatch, then auto-unsubscribe. */
  once<K extends keyof M>(event: K, listener: Listener<M[K]>): Unsubscribe {
    return this.add(event, listener, true)
  }

  /**
   * Remove a previously registered listener for an event. Removes a single
   * matching registration (the earliest), mirroring Node's EventEmitter, so
   * duplicate subscriptions must be removed once each.
   */
  off<K extends keyof M>(event: K, listener: Listener<M[K]>): this {
    const registrations = this.registry.get(event)
    if (!registrations) return this

    const index = registrations.findIndex((r) => r.listener === listener)
    if (index !== -1) registrations.splice(index, 1)
    if (registrations.length === 0) this.registry.delete(event)
    return this
  }

  /**
   * Dispatch an event to every current listener. Returns `true` when at least
   * one typed listener was registered for the event (any-listeners do not
   * count). A snapshot of listeners is taken first, so subscribing or
   * unsubscribing from inside a handler never affects the dispatch in flight.
   */
  emit<K extends keyof M>(event: K, payload: M[K]): boolean {
    const registrations = this.registry.get(event)
    const hadListeners = !!registrations && registrations.length > 0

    if (registrations) {
      const snapshot = registrations.slice()
      for (let i = 0; i < snapshot.length; i++) {
        const registration = snapshot[i]
        if (registration.once) this.remove(event, registration)
        this.invoke(() => registration.listener(payload), event)
      }
    }

    if (this.anyListeners.length > 0) {
      const snapshot = this.anyListeners.slice()
      for (let i = 0; i < snapshot.length; i++) {
        const anyListener = snapshot[i]
        this.invoke(() => anyListener(event, payload), event)
      }
    }

    return hadListeners
  }

  /** Observe every event on the emitter. Useful for logging and metrics. */
  onAny(listener: AnyListener<M>): Unsubscribe {
    this.anyListeners.push(listener)
    let active = true
    return () => {
      if (!active) return
      active = false
      this.offAny(listener)
    }
  }

  /** Remove a single any-listener registered with `onAny`. */
  offAny(listener: AnyListener<M>): this {
    const index = this.anyListeners.indexOf(listener)
    if (index !== -1) this.anyListeners.splice(index, 1)
    return this
  }

  /**
   * Remove listeners. With an event name, clears listeners for that event
   * only; with no argument, clears everything including any-listeners.
   */
  removeAllListeners<K extends keyof M>(event?: K): this {
    if (event === undefined) {
      this.registry.clear()
      this.anyListeners.length = 0
    } else {
      this.registry.delete(event)
    }
    return this
  }

  /** Number of typed listeners registered for an event. */
  listenerCount<K extends keyof M>(event: K): number {
    return this.registry.get(event)?.length ?? 0
  }

  /** Names of events that currently have at least one typed listener. */
  eventNames(): Array<keyof M> {
    return Array.from(this.registry.keys())
  }

  private add<K extends keyof M>(
    event: K,
    listener: Listener<M[K]>,
    once: boolean,
  ): Unsubscribe {
    const registration: Registration<unknown> = {
      listener: listener as Listener<unknown>,
      once,
    }
    const registrations = this.registry.get(event)
    if (registrations) {
      registrations.push(registration)
    } else {
      this.registry.set(event, [registration])
    }

    let active = true
    return () => {
      if (!active) return
      active = false
      const current = this.registry.get(event)
      if (!current) return
      const index = current.indexOf(registration)
      if (index !== -1) current.splice(index, 1)
      if (current.length === 0) this.registry.delete(event)
    }
  }

  private remove(event: keyof M, registration: Registration<unknown>): void {
    const registrations = this.registry.get(event)
    if (!registrations) return
    const index = registrations.indexOf(registration)
    if (index !== -1) registrations.splice(index, 1)
    if (registrations.length === 0) this.registry.delete(event)
  }

  private invoke(run: () => void, event: keyof M): void {
    try {
      run()
    } catch (error) {
      this.onError(error, event)
    }
  }
}
