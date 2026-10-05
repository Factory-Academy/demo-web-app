import {
  StateMachine,
  createStateMachine,
  StateMachineDefinition,
} from '../src/utils/state-machine'

type Light = 'red' | 'yellow' | 'green'
type LightEvent = 'go' | 'caution' | 'stop'

const trafficLight: StateMachineDefinition<Light, LightEvent> = {
  initial: 'red',
  states: ['red', 'yellow', 'green'],
  transitions: [
    { from: 'red', event: 'go', to: 'green' },
    { from: 'green', event: 'caution', to: 'yellow' },
    { from: 'yellow', event: 'stop', to: 'red' },
  ],
}

describe('StateMachine', () => {
  describe('construction', () => {
    test('exposes initial state and states', () => {
      const machine = createStateMachine(trafficLight)
      expect(machine.initial).toBe('red')
      expect(machine.states).toEqual(['red', 'yellow', 'green'])
    })

    test('throws when there are no states', () => {
      expect(
        () =>
          new StateMachine({
            initial: 'red' as Light,
            states: [] as Light[],
            transitions: [],
          })
      ).toThrow('at least one state')
    })

    test('throws when the initial state is not declared', () => {
      expect(
        () =>
          new StateMachine<Light, LightEvent>({
            initial: 'blue' as Light,
            states: ['red', 'green'],
            transitions: [],
          })
      ).toThrow('Initial state')
    })

    test('throws when a transition source state is unknown', () => {
      expect(
        () =>
          new StateMachine<Light, LightEvent>({
            initial: 'red',
            states: ['red', 'green'],
            transitions: [{ from: 'yellow', event: 'stop', to: 'red' }],
          })
      ).toThrow('unknown source state "yellow"')
    })

    test('throws when a transition target state is unknown', () => {
      expect(
        () =>
          new StateMachine<Light, LightEvent>({
            initial: 'red',
            states: ['red', 'green'],
            transitions: [{ from: 'red', event: 'go', to: 'yellow' }],
          })
      ).toThrow('unknown target state "yellow"')
    })

    test('throws when two unconditional transitions share a source and event', () => {
      expect(
        () =>
          new StateMachine<Light, LightEvent>({
            initial: 'red',
            states: ['red', 'yellow', 'green'],
            transitions: [
              { from: 'red', event: 'go', to: 'green' },
              { from: 'red', event: 'go', to: 'yellow' },
            ],
          })
      ).toThrow('Duplicate unconditional transition for event "go" from state "red"')
    })

    test('detects a duplicate hidden behind a multi-source transition', () => {
      expect(
        () =>
          new StateMachine<Light, LightEvent>({
            initial: 'red',
            states: ['red', 'yellow', 'green'],
            transitions: [
              { from: 'yellow', event: 'stop', to: 'red' },
              { from: ['yellow', 'green'], event: 'stop', to: 'red' },
            ],
          })
      ).toThrow('Duplicate unconditional transition for event "stop" from state "yellow"')
    })

    test('allows a guarded transition to sit beside an unconditional one', () => {
      expect(
        () =>
          new StateMachine<Light, LightEvent, { emergency: boolean }>({
            initial: 'red',
            states: ['red', 'yellow', 'green'],
            transitions: [
              { from: 'red', event: 'go', to: 'green' },
              {
                from: 'red',
                event: 'go',
                to: 'yellow',
                guard: ({ data }) => Boolean(data?.emergency),
              },
            ],
          })
      ).not.toThrow()
    })
  })

  describe('can / next', () => {
    const machine = createStateMachine(trafficLight)

    test('can returns true for a valid event', () => {
      expect(machine.can('red', 'go')).toBe(true)
    })

    test('can returns false for an invalid event', () => {
      expect(machine.can('red', 'stop')).toBe(false)
    })

    test('next returns the target state for a valid event', () => {
      expect(machine.next('green', 'caution')).toBe('yellow')
    })

    test('next returns null for an invalid event', () => {
      expect(machine.next('green', 'stop')).toBeNull()
    })
  })

  describe('transition', () => {
    const machine = createStateMachine(trafficLight)

    test('accepts a valid transition and reports the new state', () => {
      const result = machine.transition('red', 'go')
      expect(result).toEqual({ ok: true, state: 'green', changed: true })
    })

    test('rejects a disallowed event without changing state', () => {
      const result = machine.transition('red', 'stop')
      expect(result.ok).toBe(false)
      expect(result.state).toBe('red')
      expect(result.changed).toBe(false)
      expect(result.error).toContain('not allowed from state "red"')
    })

    test('rejects an unknown current state', () => {
      const result = machine.transition('blue' as Light, 'go')
      expect(result.ok).toBe(false)
      expect(result.error).toContain('Unknown state "blue"')
    })

    test('omits a reason on a successful transition', () => {
      const result = machine.transition('red', 'go')
      expect(result).not.toHaveProperty('reason')
    })

    test('classifies an unknown current state', () => {
      const result = machine.transition('blue' as Light, 'go')
      expect(result.reason).toBe('unknown-state')
    })

    test('classifies a declared event used from the wrong state', () => {
      // `stop` is declared (yellow -> red) but not valid from red.
      const result = machine.transition('red', 'stop')
      expect(result.reason).toBe('not-allowed')
    })

    test('classifies an event that no transition declares', () => {
      const result = machine.transition('red', 'reset' as LightEvent)
      expect(result.reason).toBe('unknown-event')
      expect(result.error).toContain('not defined on this machine')
    })

    test('reports a self-transition as accepted but unchanged', () => {
      const idle = createStateMachine<Light, LightEvent>({
        initial: 'red',
        states: ['red', 'green'],
        transitions: [{ from: 'red', event: 'stop', to: 'red' }],
      })
      const result = idle.transition('red', 'stop')
      expect(result.ok).toBe(true)
      expect(result.state).toBe('red')
      expect(result.changed).toBe(false)
    })
  })

  describe('multiple source states', () => {
    type Doc = 'draft' | 'review' | 'archived'
    type DocEvent = 'archive' | 'restore'

    const machine = createStateMachine<Doc, DocEvent>({
      initial: 'draft',
      states: ['draft', 'review', 'archived'],
      transitions: [
        { from: ['draft', 'review'], event: 'archive', to: 'archived' },
        { from: 'archived', event: 'restore', to: 'draft' },
      ],
    })

    test('a shared event applies from every listed source', () => {
      expect(machine.next('draft', 'archive')).toBe('archived')
      expect(machine.next('review', 'archive')).toBe('archived')
    })

    test('the event is rejected from a non-listed source', () => {
      expect(machine.can('archived', 'archive')).toBe(false)
    })
  })

  describe('guards', () => {
    type Order = 'cart' | 'placed'
    type OrderEvent = 'checkout'

    const machine = createStateMachine<Order, OrderEvent, { itemCount: number }>({
      initial: 'cart',
      states: ['cart', 'placed'],
      transitions: [
        {
          from: 'cart',
          event: 'checkout',
          to: 'placed',
          guard: ({ data }) => (data?.itemCount ?? 0) > 0,
        },
      ],
    })

    test('allows the transition when the guard passes', () => {
      const result = machine.transition('cart', 'checkout', { itemCount: 2 })
      expect(result.ok).toBe(true)
      expect(result.state).toBe('placed')
    })

    test('blocks the transition when the guard fails', () => {
      const result = machine.transition('cart', 'checkout', { itemCount: 0 })
      expect(result.ok).toBe(false)
      expect(result.state).toBe('cart')
    })

    test('classifies a guard rejection as guard-blocked', () => {
      const result = machine.transition('cart', 'checkout', { itemCount: 0 })
      expect(result.reason).toBe('guard-blocked')
      expect(result.error).toContain('blocked by a guard')
    })

    test('can and availableEvents respect guards', () => {
      expect(machine.can('cart', 'checkout', { itemCount: 0 })).toBe(false)
      expect(machine.availableEvents('cart', { itemCount: 0 })).toEqual([])
      expect(machine.availableEvents('cart', { itemCount: 1 })).toEqual(['checkout'])
    })
  })

  describe('availableEvents', () => {
    const machine = createStateMachine(trafficLight)

    test('lists the events accepted from a state', () => {
      expect(machine.availableEvents('red')).toEqual(['go'])
    })

    test('returns an empty list when no events apply', () => {
      const machine = createStateMachine<Light, LightEvent>({
        initial: 'red',
        states: ['red', 'yellow', 'green'],
        transitions: [{ from: 'red', event: 'go', to: 'green' }],
      })
      expect(machine.availableEvents('yellow')).toEqual([])
    })

    test('does not duplicate an event available via several transitions', () => {
      type S = 'a' | 'b' | 'c'
      type E = 'move'
      const machine = createStateMachine<S, E>({
        initial: 'a',
        states: ['a', 'b', 'c'],
        transitions: [
          { from: 'a', event: 'move', to: 'b' },
          { from: 'a', event: 'move', to: 'c', guard: () => false },
        ],
      })
      expect(machine.availableEvents('a')).toEqual(['move'])
    })
  })

  describe('knownEvents', () => {
    test('lists every declared event once, in declaration order', () => {
      const machine = createStateMachine(trafficLight)
      expect(machine.knownEvents()).toEqual(['go', 'caution', 'stop'])
    })

    test('deduplicates an event declared on several transitions', () => {
      type S = 'a' | 'b' | 'c'
      type E = 'move' | 'reset'
      const machine = createStateMachine<S, E>({
        initial: 'a',
        states: ['a', 'b', 'c'],
        transitions: [
          { from: 'a', event: 'move', to: 'b' },
          { from: 'b', event: 'move', to: 'c' },
          { from: 'c', event: 'reset', to: 'a' },
        ],
      })
      expect(machine.knownEvents()).toEqual(['move', 'reset'])
    })

    test('returns a copy that callers cannot use to mutate the machine', () => {
      const machine = createStateMachine(trafficLight)
      machine.knownEvents().push('tamper' as LightEvent)
      expect(machine.knownEvents()).toEqual(['go', 'caution', 'stop'])
    })
  })

  describe('isFinal', () => {
    test('a state with no outgoing transitions is final', () => {
      const machine = createStateMachine<Light, LightEvent>({
        initial: 'red',
        states: ['red', 'green'],
        transitions: [{ from: 'red', event: 'go', to: 'green' }],
      })
      expect(machine.isFinal('green')).toBe(true)
      expect(machine.isFinal('red')).toBe(false)
    })
  })
})
