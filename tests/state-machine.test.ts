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
