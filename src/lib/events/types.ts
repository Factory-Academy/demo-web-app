/**
 * Shared types for the typed event emitter.
 *
 * An {@link EventMap} is the contract between an emitter and its callers: it
 * maps each event name to the exact payload type that `emit` requires and that
 * listeners receive. Everything downstream (`on`, `once`, `emit`, `waitFor`)
 * is keyed off this map so a typo in an event name or a mismatched payload is
 * a compile-time error rather than a runtime surprise.
 */

/** A mapping of event name → payload type. */
export type EventMap = Record<string, unknown>

/** The valid event names of a map (string keys only). */
export type EventName<T extends EventMap> = keyof T & string

/** A listener for a single event, receiving that event's payload. */
export type Listener<T> = (payload: T) => void

/**
 * Handle returned by `on`/`once` that detaches the listener when called.
 * Calling it more than once is safe and a no-op after the first call.
 */
export type Unsubscribe = () => void

export interface EmitterOptions<T extends EventMap> {
  /**
   * Soft cap on listeners per event. Exceeding it triggers {@link onWarning}
   * (a likely leak) but never throws or drops listeners. `0` disables the
   * check. Defaults to {@link DEFAULT_MAX_LISTENERS}.
   */
  maxListeners?: number
  /**
   * Where a listener's thrown error is routed. When provided, a throwing
   * listener never interrupts the others and the error is reported here.
   * When omitted, `emit` surfaces listener errors to its own caller instead
   * (see {@link TypedEmitter.emit}).
   */
  onError?: (error: unknown, event: EventName<T>, payload: unknown) => void
  /** Sink for leak warnings. Injectable for tests; defaults to `console.warn`. */
  onWarning?: (message: string) => void
}

/** Default per-event listener cap, matching Node's `EventEmitter`. */
export const DEFAULT_MAX_LISTENERS = 10
