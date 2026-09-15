import { TypedEventEmitter } from '../src/services/event-emitter'
import { EventMap } from '../src/models/event'

interface TestEvents extends EventMap {
  ping: { at: number }
  message: string
  reset: undefined
}

describe('TypedEventEmitter', () => {
  describe('on / emit', () => {
    test('delivers the payload to a subscribed handler', () => {
      const bus = new TypedEventEmitter<TestEvents>()
      const handler = jest.fn()

      bus.on('ping', handler)
      const delivered = bus.emit('ping', { at: 42 })

      expect(delivered).toBe(true)
      expect(handler).toHaveBeenCalledTimes(1)
      expect(handler).toHaveBeenCalledWith({ at: 42 })
    })

    test('invokes multiple handlers in registration order', () => {
      const bus = new TypedEventEmitter<TestEvents>()
      const calls: number[] = []

      bus.on('ping', () => calls.push(1))
      bus.on('ping', () => calls.push(2))
      bus.on('ping', () => calls.push(3))
      bus.emit('ping', { at: 0 })

      expect(calls).toEqual([1, 2, 3])
    })

    test('returns false when no handler is registered', () => {
      const bus = new TypedEventEmitter<TestEvents>()

      expect(bus.emit('ping', { at: 0 })).toBe(false)
    })

    test('does not cross-deliver between different events', () => {
      const bus = new TypedEventEmitter<TestEvents>()
      const pingHandler = jest.fn()
      const messageHandler = jest.fn()

      bus.on('ping', pingHandler)
      bus.on('message', messageHandler)
      bus.emit('message', 'hello')

      expect(messageHandler).toHaveBeenCalledWith('hello')
      expect(pingHandler).not.toHaveBeenCalled()
    })

    test('invokes the same handler once per registration', () => {
      const bus = new TypedEventEmitter<TestEvents>()
      const handler = jest.fn()

      bus.on('message', handler)
      bus.on('message', handler)
      bus.emit('message', 'x')

      expect(handler).toHaveBeenCalledTimes(2)
    })
  })

  describe('once', () => {
    test('fires only on the first emit', () => {
      const bus = new TypedEventEmitter<TestEvents>()
      const handler = jest.fn()

      bus.once('message', handler)
      bus.emit('message', 'first')
      bus.emit('message', 'second')

      expect(handler).toHaveBeenCalledTimes(1)
      expect(handler).toHaveBeenCalledWith('first')
      expect(bus.listenerCount('message')).toBe(0)
    })

    test('can be unsubscribed before it fires', () => {
      const bus = new TypedEventEmitter<TestEvents>()
      const handler = jest.fn()

      const off = bus.once('message', handler)
      off()
      bus.emit('message', 'ignored')

      expect(handler).not.toHaveBeenCalled()
    })

    test('is not re-triggered when its handler re-emits the same event', () => {
      const bus = new TypedEventEmitter<TestEvents>()
      let count = 0

      bus.once('message', () => {
        count += 1
        if (count < 5) bus.emit('message', 'again')
      })
      bus.emit('message', 'start')

      expect(count).toBe(1)
    })
  })

  describe('off / unsubscribe', () => {
    test('off removes a specific handler', () => {
      const bus = new TypedEventEmitter<TestEvents>()
      const keep = jest.fn()
      const drop = jest.fn()

      bus.on('ping', keep)
      bus.on('ping', drop)
      bus.off('ping', drop)
      bus.emit('ping', { at: 1 })

      expect(keep).toHaveBeenCalledTimes(1)
      expect(drop).not.toHaveBeenCalled()
    })

    test('off removes only one of duplicate registrations', () => {
      const bus = new TypedEventEmitter<TestEvents>()
      const handler = jest.fn()

      bus.on('ping', handler)
      bus.on('ping', handler)
      bus.off('ping', handler)
      bus.emit('ping', { at: 1 })

      expect(handler).toHaveBeenCalledTimes(1)
    })

    test('off is a no-op for an unknown handler or event', () => {
      const bus = new TypedEventEmitter<TestEvents>()

      expect(() => bus.off('ping', jest.fn())).not.toThrow()
      expect(() => bus.off('reset', jest.fn())).not.toThrow()
    })

    test('the returned unsubscribe stops delivery', () => {
      const bus = new TypedEventEmitter<TestEvents>()
      const handler = jest.fn()

      const off = bus.on('ping', handler)
      off()
      bus.emit('ping', { at: 1 })

      expect(handler).not.toHaveBeenCalled()
    })

    test('calling unsubscribe twice does not remove an unrelated handler', () => {
      const bus = new TypedEventEmitter<TestEvents>()
      const first = jest.fn()
      const second = jest.fn()

      const offFirst = bus.on('ping', first)
      offFirst()
      // A stale double-call must not remove `second`, which took the freed slot.
      bus.on('ping', second)
      offFirst()
      bus.emit('ping', { at: 1 })

      expect(first).not.toHaveBeenCalled()
      expect(second).toHaveBeenCalledTimes(1)
    })
  })

  describe('dispatch snapshot semantics', () => {
    test('a handler added during emit does not run in that emit', () => {
      const bus = new TypedEventEmitter<TestEvents>()
      const late = jest.fn()

      bus.on('ping', () => {
        bus.on('ping', late)
      })
      bus.emit('ping', { at: 1 })

      expect(late).not.toHaveBeenCalled()
      bus.emit('ping', { at: 2 })
      expect(late).toHaveBeenCalledTimes(1)
    })

    test('a handler that removes a later handler still runs the snapshot', () => {
      const bus = new TypedEventEmitter<TestEvents>()
      const second = jest.fn()

      bus.on('ping', () => bus.off('ping', second))
      bus.on('ping', second)
      bus.emit('ping', { at: 1 })

      // second was captured in the snapshot before it was removed
      expect(second).toHaveBeenCalledTimes(1)
      // and is gone for subsequent emits
      bus.emit('ping', { at: 2 })
      expect(second).toHaveBeenCalledTimes(1)
    })
  })

  describe('error handling', () => {
    test('onError receives each thrown error and other handlers still run', () => {
      const onError = jest.fn()
      const bus = new TypedEventEmitter<TestEvents>({ onError })
      const after = jest.fn()
      const boom = new Error('boom')

      bus.on('message', () => {
        throw boom
      })
      bus.on('message', after)

      expect(bus.emit('message', 'x')).toBe(true)
      expect(onError).toHaveBeenCalledWith(boom, 'message')
      expect(after).toHaveBeenCalledTimes(1)
    })

    test('without onError a single error is rethrown unchanged after all run', () => {
      const bus = new TypedEventEmitter<TestEvents>()
      const after = jest.fn()
      const boom = new Error('only')

      bus.on('message', () => {
        throw boom
      })
      bus.on('message', after)

      expect(() => bus.emit('message', 'x')).toThrow(boom)
      expect(after).toHaveBeenCalledTimes(1)
    })

    test('without onError multiple errors surface together after all run', () => {
      const bus = new TypedEventEmitter<TestEvents>()
      const after = jest.fn()

      bus.on('message', () => {
        throw new Error('first')
      })
      bus.on('message', () => {
        throw new Error('second')
      })
      bus.on('message', after)

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
      // Order matches registration order, and no failure is dropped.
      expect(messages).toEqual(['first', 'second'])
      expect(after).toHaveBeenCalledTimes(1)
    })
  })

  describe('introspection', () => {
    test('listenerCount reflects registrations and removals', () => {
      const bus = new TypedEventEmitter<TestEvents>()
      const handler = jest.fn()

      expect(bus.listenerCount('ping')).toBe(0)
      const off = bus.on('ping', handler)
      expect(bus.listenerCount('ping')).toBe(1)
      off()
      expect(bus.listenerCount('ping')).toBe(0)
    })

    test('eventNames lists only events with active handlers', () => {
      const bus = new TypedEventEmitter<TestEvents>()

      bus.on('ping', jest.fn())
      const off = bus.on('message', jest.fn())
      expect(bus.eventNames().sort()).toEqual(['message', 'ping'])

      off()
      expect(bus.eventNames()).toEqual(['ping'])
    })
  })

  describe('removeAllListeners', () => {
    test('clears a single event when given a name', () => {
      const bus = new TypedEventEmitter<TestEvents>()

      bus.on('ping', jest.fn())
      bus.on('message', jest.fn())
      bus.removeAllListeners('ping')

      expect(bus.listenerCount('ping')).toBe(0)
      expect(bus.listenerCount('message')).toBe(1)
    })

    test('clears every event when called without arguments', () => {
      const bus = new TypedEventEmitter<TestEvents>()

      bus.on('ping', jest.fn())
      bus.on('message', jest.fn())
      bus.removeAllListeners()

      expect(bus.eventNames()).toEqual([])
    })
  })

  describe('leak detection', () => {
    test('warns once when the handler ceiling is exceeded', () => {
      const warn = jest.spyOn(console, 'warn').mockImplementation(() => {})
      const bus = new TypedEventEmitter<TestEvents>({ maxListeners: 2 })

      bus.on('ping', jest.fn())
      bus.on('ping', jest.fn())
      expect(warn).not.toHaveBeenCalled()

      bus.on('ping', jest.fn())
      bus.on('ping', jest.fn())
      expect(warn).toHaveBeenCalledTimes(1)
      expect(warn.mock.calls[0][0]).toContain('ping')

      warn.mockRestore()
    })

    test('maxListeners of 0 disables the warning', () => {
      const warn = jest.spyOn(console, 'warn').mockImplementation(() => {})
      const bus = new TypedEventEmitter<TestEvents>({ maxListeners: 0 })

      for (let i = 0; i < 50; i += 1) bus.on('ping', jest.fn())
      expect(warn).not.toHaveBeenCalled()

      warn.mockRestore()
    })
  })
})
