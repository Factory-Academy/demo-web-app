/**
 * Lightweight, strongly-typed event emitter / pub-sub.
 *
 * Define an {@link EventMap} describing your events and their payloads, then
 * create a {@link TypedEmitter} to publish and subscribe with full type
 * safety. The emitter is transport-agnostic and dependency-free.
 */

export {
  type EventMap,
  type EventName,
  type Listener,
  type Unsubscribe,
  type EmitterOptions,
  DEFAULT_MAX_LISTENERS,
} from './types'

export { EmitterError, ListenerDispatchError } from './errors'

export { TypedEmitter, createEmitter } from './emitter'
