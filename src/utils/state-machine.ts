/**
 * Lightweight finite state machine
 *
 * Provides a small, dependency-free primitive for modelling an entity's
 * lifecycle as a set of explicit states and the events that move between
 * them. Transitions are declarative and may be guarded, so illegal moves
 * (for example completing a record that was never activated) are rejected
 * in one place instead of being re-implemented at every call site.
 *
 * The machine itself is stateless: `transition` is a pure function of the
 * current state and an event. Callers hold their own state (typically a
 * persisted field) and feed it back in, which keeps the primitive easy to
 * reuse across services and request handlers.
 */

/**
 * Context passed to a transition guard before the move is accepted.
 */
export interface TransitionContext<
  S extends string,
  E extends string,
  C = unknown
> {
  from: S
  to: S
  event: E
  data?: C
}

/**
 * Predicate that decides whether a candidate transition is allowed.
 * Returning `false` makes the transition behave as if it were undefined.
 */
export type TransitionGuard<
  S extends string,
  E extends string,
  C = unknown
> = (context: TransitionContext<S, E, C>) => boolean

/**
 * A single declarative transition. `from` may list several source states
 * that all respond to the same event in the same way.
 */
export interface TransitionDefinition<
  S extends string,
  E extends string,
  C = unknown
> {
  from: S | S[]
  event: E
  to: S
  guard?: TransitionGuard<S, E, C>
}

/**
 * Full description of a machine: its initial state, the complete set of
 * valid states, and the transitions between them.
 */
export interface StateMachineDefinition<
  S extends string,
  E extends string,
  C = unknown
> {
  initial: S
  states: readonly S[]
  transitions: ReadonlyArray<TransitionDefinition<S, E, C>>
}

/**
 * Why a transition was rejected. Lets callers branch on a stable code
 * instead of string-matching the human-readable `error`, so, for example, a
 * request handler can map each case onto a different HTTP status.
 *
 * - `unknown-state`: `current` is not one of the machine's declared states
 *   (typically corrupt or externally mutated persisted data).
 * - `unknown-event`: `event` is not referenced by any transition at all.
 * - `not-allowed`: the event exists elsewhere, but not from `current`.
 * - `guard-blocked`: a transition is declared from `current` for the event,
 *   but its guard rejected the move for the supplied data.
 */
export type TransitionReason =
  | 'unknown-state'
  | 'unknown-event'
  | 'not-allowed'
  | 'guard-blocked'

/**
 * Outcome of attempting a transition.
 *
 * - `ok` indicates whether the event was accepted.
 * - `state` is the resulting state when accepted, otherwise the unchanged
 *   current state.
 * - `changed` is `true` only when the state actually moved. A transition
 *   whose target equals its source is accepted but reports `changed: false`.
 * - `reason` classifies a rejection; it is omitted on success.
 * - `error` carries a human-readable message when the event was rejected.
 */
export interface TransitionResult<S extends string> {
  ok: boolean
  state: S
  changed: boolean
  reason?: TransitionReason
  error?: string
}

/**
 * A reusable finite state machine built from a declarative definition.
 *
 * The definition is validated on construction so that a mistyped state in
 * a transition fails fast rather than silently producing dead transitions.
 */
export class StateMachine<
  S extends string,
  E extends string,
  C = unknown
> {
  readonly initial: S
  readonly states: readonly S[]
  private readonly transitions: ReadonlyArray<TransitionDefinition<S, E, C>>
  private readonly declaredEvents: Set<E>
  private readonly declaredEventList: E[]

  constructor(definition: StateMachineDefinition<S, E, C>) {
    const known = new Set<string>(definition.states)

    if (definition.states.length === 0) {
      throw new Error('StateMachine requires at least one state')
    }
    if (!known.has(definition.initial)) {
      throw new Error(
        `Initial state "${definition.initial}" is not in the declared states`
      )
    }

    const declaredEvents = new Set<E>()
    const declaredEventList: E[] = []
    // Tracks (source, event) pairs that already have an unconditional
    // transition, so a second one can be rejected as ambiguous.
    const unconditional = new Set<string>()

    for (const transition of definition.transitions) {
      const sources = this.normalizeFrom(transition.from)
      for (const source of sources) {
        if (!known.has(source)) {
          throw new Error(
            `Transition for event "${transition.event}" references unknown source state "${source}"`
          )
        }
      }
      if (!known.has(transition.to)) {
        throw new Error(
          `Transition for event "${transition.event}" references unknown target state "${transition.to}"`
        )
      }

      if (!declaredEvents.has(transition.event)) {
        declaredEvents.add(transition.event)
        declaredEventList.push(transition.event)
      }

      // Two unguarded transitions for the same source and event would make
      // the chosen target depend on declaration order. A guarded transition
      // is conditional, so it may legitimately sit beside others.
      if (!transition.guard) {
        for (const source of sources) {
          const key = `${source}\u0000${transition.event}`
          if (unconditional.has(key)) {
            throw new Error(
              `Duplicate unconditional transition for event "${transition.event}" from state "${source}"`
            )
          }
          unconditional.add(key)
        }
      }
    }

    this.initial = definition.initial
    this.states = definition.states
    this.transitions = definition.transitions
    this.declaredEvents = declaredEvents
    this.declaredEventList = declaredEventList
  }

  private normalizeFrom(from: S | S[]): S[] {
    return Array.isArray(from) ? from : [from]
  }

  private findTransition(
    from: S,
    event: E,
    data?: C
  ): TransitionDefinition<S, E, C> | undefined {
    return this.transitions.find((transition) => {
      if (transition.event !== event) return false
      if (!this.normalizeFrom(transition.from).includes(from)) return false
      if (
        transition.guard &&
        !transition.guard({ from, to: transition.to, event, data })
      ) {
        return false
      }
      return true
    })
  }

  /**
   * Whether any transition is declared from `from` for `event`, ignoring
   * guards. Used to tell a guard-blocked move apart from one that is simply
   * not allowed from the current state.
   */
  private hasTransitionFor(from: S, event: E): boolean {
    return this.transitions.some(
      (transition) =>
        transition.event === event &&
        this.normalizeFrom(transition.from).includes(from)
    )
  }

  /**
   * Every event referenced by a transition, in declaration order and
   * without duplicates.
   */
  knownEvents(): E[] {
    return this.declaredEventList.slice()
  }

  /**
   * Whether `event` is accepted from `from`, taking guards into account.
   */
  can(from: S, event: E, data?: C): boolean {
    return this.findTransition(from, event, data) !== undefined
  }

  /**
   * The state that `event` would lead to from `from`, or `null` if the
   * event is not accepted.
   */
  next(from: S, event: E, data?: C): S | null {
    const transition = this.findTransition(from, event, data)
    return transition ? transition.to : null
  }

  /**
   * Attempt to apply `event` to `current`. Pure: never mutates anything,
   * always returns a result describing the outcome.
   */
  transition(current: S, event: E, data?: C): TransitionResult<S> {
    if (!this.states.includes(current)) {
      return {
        ok: false,
        state: current,
        changed: false,
        reason: 'unknown-state',
        error: `Unknown state "${current}"`,
      }
    }

    const transition = this.findTransition(current, event, data)
    if (transition) {
      return {
        ok: true,
        state: transition.to,
        changed: transition.to !== current,
      }
    }

    if (!this.declaredEvents.has(event)) {
      return {
        ok: false,
        state: current,
        changed: false,
        reason: 'unknown-event',
        error: `Event "${event}" is not defined on this machine`,
      }
    }

    // The event exists and a transition is declared from this state, so the
    // only thing that could have rejected the move is a guard.
    if (this.hasTransitionFor(current, event)) {
      return {
        ok: false,
        state: current,
        changed: false,
        reason: 'guard-blocked',
        error: `Event "${event}" is blocked by a guard from state "${current}"`,
      }
    }

    return {
      ok: false,
      state: current,
      changed: false,
      reason: 'not-allowed',
      error: `Event "${event}" is not allowed from state "${current}"`,
    }
  }

  /**
   * The events accepted from `from`, without duplicates.
   */
  availableEvents(from: S, data?: C): E[] {
    const events: E[] = []
    for (const transition of this.transitions) {
      if (!this.normalizeFrom(transition.from).includes(from)) continue
      if (
        transition.guard &&
        !transition.guard({ from, to: transition.to, event: transition.event, data })
      ) {
        continue
      }
      if (!events.includes(transition.event)) events.push(transition.event)
    }
    return events
  }

  /**
   * Whether `state` is terminal, i.e. has no outgoing transitions.
   */
  isFinal(state: S): boolean {
    return !this.transitions.some((transition) =>
      this.normalizeFrom(transition.from).includes(state)
    )
  }
}

/**
 * Convenience factory mirroring the functional style used elsewhere in
 * `utils`. Equivalent to `new StateMachine(definition)`.
 */
export function createStateMachine<
  S extends string,
  E extends string,
  C = unknown
>(definition: StateMachineDefinition<S, E, C>): StateMachine<S, E, C> {
  return new StateMachine(definition)
}
