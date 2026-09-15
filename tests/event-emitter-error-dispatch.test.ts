import { TypedEventEmitter } from '../src/services/event-emitter'
import { EventMap } from '../src/models/event'

interface TestEvents extends EventMap {
  message: string
  ping: { at: number }
}

/**
 * Focused coverage for the edge cases around error dispatch: a throwing
 * `onError`, multiple simultaneous failures, self-cleaning `once` handlers that
 * throw, and re-entrant emits. These complement the broader behavior checks in
 * `event-emitter.test.ts`.
 */
describe('TypedEventEmitter error dispatch', () => {
  describe('all handlers run regardless of failures', () => {
    test('a throwing handler does not stop the ones after it (default mode)', () => {
      const bus = new TypedEventEmitter<TestEvents>()
      const before = jest.fn()
      const after = jest.fn()

      bus.on('message', before)
      bus.on('message', () => {
        throw new Error('middle')
      })
      bus.on('message', after)

      expect(() => bus.emit('message', 'x')).toThrow('middle')
      expect(before).toHaveBeenCalledTimes(1)
      expect(after).toHaveBeenCalledTimes(1)
    })

    test('a throwing handler does not stop the ones after it (onError mode)', () => {
      const onError = jest.fn()
      const bus = new TypedEventEmitter<TestEvents>({ onError })
      const before = jest.fn()
      const after = jest.fn()

      bus.on('message', before)
      bus.on('message', () => {
        throw new Error('middle')
      })
      bus.on('message', after)

      expect(bus.emit('message', 'x')).toBe(true)
      expect(before).toHaveBeenCalledTimes(1)
      expect(after).toHaveBeenCalledTimes(1)
      expect(onError).toHaveBeenCalledTimes(1)
    })
  })

  describe('onError routing', () => {
    test('every error reaches onError with its event name', () => {
      const onError = jest.fn()
      const bus = new TypedEventEmitter<TestEvents>({ onError })
      const first = new Error('first')
      const second = new Error('second')

      bus.on('message', () => {
        throw first
      })
      bus.on('message', () => {
        throw second
      })

      bus.emit('message', 'x')

      expect(onError).toHaveBeenNthCalledWith(1, first, 'message')
      expect(onError).toHaveBeenNthCalledWith(2, second, 'message')
    })

    test('an onError that itself throws does not abort the dispatch', () => {
      const after = jest.fn()
      const bus = new TypedEventEmitter<TestEvents>({
        onError: () => {
          throw new Error('sink exploded')
        },
      })

      bus.on('message', () => {
        throw new Error('handler failure')
      })
      bus.on('message', after)

      // The handler after the failing one still runs...
      expect(() => bus.emit('message', 'x')).toThrow('sink exploded')
      expect(after).toHaveBeenCalledTimes(1)
    })

    test('multiple onError failures surface as an AggregateError', () => {
      const bus = new TypedEventEmitter<TestEvents>({
        onError: (error) => {
          // Rethrow so both sink failures must be preserved.
          throw error
        },
      })

      bus.on('message', () => {
        throw new Error('alpha')
      })
      bus.on('message', () => {
        throw new Error('beta')
      })

      let caught: unknown
      try {
        bus.emit('message', 'x')
      } catch (error) {
        caught = error
      }

      expect(caught).toBeInstanceOf(AggregateError)
      const messages = (caught as AggregateError).errors.map(
        (e) => (e as Error).message
      )
      expect(messages).toEqual(['alpha', 'beta'])
    })
  })

  describe('non-Error throw values', () => {
    test('a thrown string is preserved unchanged when it is the only failure', () => {
      const bus = new TypedEventEmitter<TestEvents>()

      bus.on('message', () => {
        throw 'plain string failure'
      })

      expect(() => bus.emit('message', 'x')).toThrow('plain string failure')
    })

    test('mixed non-Error values are all collected into the AggregateError', () => {
      const bus = new TypedEventEmitter<TestEvents>()

      bus.on('message', () => {
        throw 'string failure'
      })
      bus.on('message', () => {
        throw 42
      })

      let caught: unknown
      try {
        bus.emit('message', 'x')
      } catch (error) {
        caught = error
      }

      expect(caught).toBeInstanceOf(AggregateError)
      expect((caught as AggregateError).errors).toEqual([
        'string failure',
        42,
      ])
    })
  })

  describe('once handlers that throw', () => {
    test('a throwing once handler is still unsubscribed', () => {
      const bus = new TypedEventEmitter<TestEvents>()
      const handler = jest.fn(() => {
        throw new Error('once failure')
      })

      bus.once('message', handler)

      expect(() => bus.emit('message', 'first')).toThrow('once failure')
      // It removed itself before invoking, so a second emit is a no-op.
      expect(bus.emit('message', 'second')).toBe(false)
      expect(handler).toHaveBeenCalledTimes(1)
    })
  })

  describe('re-entrant emit', () => {
    test('an emit triggered inside a handler uses its own snapshot', () => {
      const bus = new TypedEventEmitter<TestEvents>()
      const order: string[] = []

      bus.on('message', (text) => {
        order.push(`outer:${text}`)
        if (text === 'start') bus.emit('message', 'nested')
      })

      bus.emit('message', 'start')

      expect(order).toEqual(['outer:start', 'outer:nested'])
    })

    test('a failure in a nested emit propagates to the outer emit', () => {
      const bus = new TypedEventEmitter<TestEvents>()

      bus.on('ping', ({ at }) => {
        if (at === 0) {
          bus.emit('ping', { at: 1 })
        } else {
          throw new Error('nested boom')
        }
      })

      expect(() => bus.emit('ping', { at: 0 })).toThrow('nested boom')
    })
  })

  describe('dispatch is unaffected by mid-flight removal', () => {
    test('removeAllListeners during emit does not skip snapshot handlers', () => {
      const bus = new TypedEventEmitter<TestEvents>()
      const second = jest.fn()

      bus.on('message', () => bus.removeAllListeners('message'))
      bus.on('message', second)

      bus.emit('message', 'x')

      // second was captured in the snapshot before removal...
      expect(second).toHaveBeenCalledTimes(1)
      // ...and the event is now empty for later emits.
      expect(bus.emit('message', 'y')).toBe(false)
    })
  })
})
