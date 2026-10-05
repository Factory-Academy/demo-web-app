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
 * Outcome of attempting a transition.
 *
 * - `ok` indicates whether the event was accepted.
 * - `state` is the resulting state when accepted, otherwise the unchanged
 *   current state.
 * - `changed` is `true` only when the state actually moved.
 * - `error` carries a human-readable reason when the event was rejected.
 */
export interface TransitionResult<S extends string> {
  ok: boolean
  state: S
  changed: boolean
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
    }

    this.initial = definition.initial
    this.states = definition.states
    this.transitions = definition.transitions
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
        error: `Unknown state "${current}"`,
      }
    }

    const transition = this.findTransition(current, event, data)
    if (!transition) {
      return {
        ok: false,
        state: current,
        changed: false,
        error: `Event "${event}" is not allowed from state "${current}"`,
      }
    }

    return {
      ok: true,
      state: transition.to,
      changed: transition.to !== current,
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
