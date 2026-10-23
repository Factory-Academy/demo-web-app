/**
 * Lightweight, strongly-typed event-emitter / pub-sub.
 *
 * Declare an {@link EventMap} and construct a {@link TypedEventEmitter} to get
 * compile-time-checked event names and payloads, synchronous re-entrancy-safe
 * dispatch, `once`/`waitFor` helpers, `AbortSignal` support, and listener-leak
 * warnings.
 */

export {
  type EventMap,
  type EventKey,
  type EventPayload,
  type Listener,
  type Unsubscribe,
  type ListenerErrorContext,
  type ListenerErrorHandler,
  type EmitterOptions,
  type SubscribeOptions,
  type WaitForOptions,
} from './types'

export {
  EmitterError,
  ListenerInvocationError,
  WaitAbortedError,
  WaitTimeoutError,
} from './errors'

export { TypedEventEmitter } from './event-emitter'
