/**
 * Error hierarchy for the event-emitter. Every emitter-specific failure
 * extends {@link EmitterError} so callers can catch the whole family with a
 * single `instanceof` check.
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
 * Wraps an error thrown by a listener. Used when no `onError` handler is
 * configured: after every listener for the emit has run, the first such error
 * is rethrown wrapped in this type, preserving the original on `cause`.
 */
export class ListenerInvocationError extends EmitterError {
  constructor(
    public readonly event: string,
    public readonly cause: unknown,
  ) {
    super(`A listener for "${event}" threw: ${describe(cause)}`)
    this.name = 'ListenerInvocationError'
    Object.setPrototypeOf(this, ListenerInvocationError.prototype)
  }
}

/** Thrown when a `waitFor` is aborted via its `AbortSignal`. */
export class WaitAbortedError extends EmitterError {
  constructor(public readonly event: string) {
    super(`waitFor("${event}") was aborted`)
    this.name = 'WaitAbortedError'
    Object.setPrototypeOf(this, WaitAbortedError.prototype)
  }
}

/** Thrown when a `waitFor` exceeds its `timeoutMs` budget. */
export class WaitTimeoutError extends EmitterError {
  constructor(
    public readonly event: string,
    public readonly timeoutMs: number,
  ) {
    super(`waitFor("${event}") timed out after ${timeoutMs}ms`)
    this.name = 'WaitTimeoutError'
    Object.setPrototypeOf(this, WaitTimeoutError.prototype)
  }
}

function describe(cause: unknown): string {
  if (cause instanceof Error) return cause.message
  return String(cause)
}
