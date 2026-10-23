/**
 * Shared types for the typed event-emitter.
 *
 * An event map is a plain interface whose keys are event names and whose
 * values are the payload type delivered with that event. Declaring one gives
 * every `on` / `once` / `emit` call compile-time names and payloads:
 *
 * ```ts
 * interface Events {
 *   opened: { id: string }
 *   closed: void
 * }
 * ```
 */

export type EventMap = Record<string, unknown>

/** The string keys of an event map (symbol/number keys are not supported). */
export type EventKey<Events extends EventMap> = Extract<keyof Events, string>

/** The payload type carried by a given event. */
export type EventPayload<
  Events extends EventMap,
  K extends EventKey<Events>,
> = Events[K]

/** A listener for a single event payload. */
export type Listener<Payload> = (payload: Payload) => void

/** Returned by `on` / `once`; calling it detaches that specific listener. */
export type Unsubscribe = () => void

/** Context handed to an {@link ListenerErrorHandler}. */
export interface ListenerErrorContext {
  /** The event whose listener threw. */
  event: string
  /** The payload that was being delivered. */
  payload: unknown
}

/**
 * Receives errors thrown by listeners. When configured, a throwing listener
 * never interrupts the other listeners for the same emit and never propagates
 * out of `emit`; the error is routed here instead.
 */
export type ListenerErrorHandler = (
  error: unknown,
  context: ListenerErrorContext,
) => void

export interface EmitterOptions {
  /**
   * Soft cap on listeners per event. Exceeding it triggers a warning (a likely
   * leak), not an error. Defaults to 10. Use `0` to disable the warning.
   */
  maxListeners?: number
  /** Where listener errors are routed. See {@link ListenerErrorHandler}. */
  onError?: ListenerErrorHandler
  /** Where max-listener warnings go. Defaults to `console.warn`. */
  onWarning?: (message: string) => void
}

/** Options accepted by `on` / `once`. */
export interface SubscribeOptions {
  /**
   * Detach the listener automatically when the signal aborts. If the signal is
   * already aborted, the listener is never attached.
   */
  signal?: AbortSignal
}

/** Options accepted by `waitFor`. */
export interface WaitForOptions {
  /** Reject the pending wait when the signal aborts. */
  signal?: AbortSignal
  /** Reject the pending wait after this many milliseconds. */
  timeoutMs?: number
}
