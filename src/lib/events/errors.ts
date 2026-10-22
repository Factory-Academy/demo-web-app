/**
 * Error types for the event emitter.
 */

// The explicit `setPrototypeOf` calls are required because the project
// compiles to ES5 (see tsconfig `target`), where subclassing the built-in
// `Error` otherwise breaks `instanceof` for the subclass.

export class EmitterError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'EmitterError'
    Object.setPrototypeOf(this, EmitterError.prototype)
  }
}

/**
 * Raised by `emit` when one or more listeners throw and no `onError` handler
 * is configured. Every listener is still invoked first; the collected errors
 * are surfaced together here so no failure is silently swallowed.
 *
 * When a single listener throws, `emit` re-throws that original error as-is
 * (preserving its type and stack); this aggregate is used only when two or
 * more listeners throw during the same dispatch.
 */
export class ListenerDispatchError extends EmitterError {
  constructor(
    public readonly event: string,
    public readonly errors: unknown[],
  ) {
    super(
      `${errors.length} listener(s) for "${event}" threw during emit`,
    )
    this.name = 'ListenerDispatchError'
    Object.setPrototypeOf(this, ListenerDispatchError.prototype)
  }
}
