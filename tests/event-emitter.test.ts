import { EventEmitter } from '../src/lib/event-emitter'

interface TestEvents {
  ping: { n: number }
  pong: { label: string }
}

describe('EventEmitter', () => {
  describe('on / emit', () => {
    test('delivers the payload to a subscribed listener', () => {
      const bus = new EventEmitter<TestEvents>()
      const received: number[] = []
      bus.on('ping', ({ n }) => received.push(n))

      bus.emit('ping', { n: 1 })
      bus.emit('ping', { n: 2 })

      expect(received).toEqual([1, 2])
    })

    test('delivers to multiple listeners in registration order', () => {
      const bus = new EventEmitter<TestEvents>()
      const order: string[] = []
      bus.on('ping', () => order.push('first'))
      bus.on('ping', () => order.push('second'))

      bus.emit('ping', { n: 0 })

      expect(order).toEqual(['first', 'second'])
    })

    test('does not deliver an event to listeners of a different event', () => {
      const bus = new EventEmitter<TestEvents>()
      const pong = jest.fn()
      bus.on('pong', pong)

      bus.emit('ping', { n: 1 })

      expect(pong).not.toHaveBeenCalled()
    })

    test('emit returns true only when the event has typed listeners', () => {
      const bus = new EventEmitter<TestEvents>()
      expect(bus.emit('ping', { n: 1 })).toBe(false)

      bus.on('ping', () => undefined)
      expect(bus.emit('ping', { n: 1 })).toBe(true)
    })

    test('the same listener added twice fires twice', () => {
      const bus = new EventEmitter<TestEvents>()
      const listener = jest.fn()
      bus.on('ping', listener)
      bus.on('ping', listener)

      bus.emit('ping', { n: 1 })

      expect(listener).toHaveBeenCalledTimes(2)
    })
  })

  describe('unsubscribe handle', () => {
    test('the returned function stops delivery', () => {
      const bus = new EventEmitter<TestEvents>()
      const listener = jest.fn()
      const off = bus.on('ping', listener)

      bus.emit('ping', { n: 1 })
      off()
      bus.emit('ping', { n: 2 })

      expect(listener).toHaveBeenCalledTimes(1)
    })

    test('calling the unsubscribe handle twice is a no-op', () => {
      const bus = new EventEmitter<TestEvents>()
      const first = jest.fn()
      const second = jest.fn()
      const off = bus.on('ping', first)
      bus.on('ping', second)

      off()
      off()

      bus.emit('ping', { n: 1 })
      expect(first).not.toHaveBeenCalled()
      expect(second).toHaveBeenCalledTimes(1)
    })
  })

  describe('once', () => {
    test('fires exactly once and then detaches', () => {
      const bus = new EventEmitter<TestEvents>()
      const listener = jest.fn()
      bus.once('ping', listener)

      bus.emit('ping', { n: 1 })
      bus.emit('ping', { n: 2 })

      expect(listener).toHaveBeenCalledTimes(1)
      expect(listener).toHaveBeenCalledWith({ n: 1 })
      expect(bus.listenerCount('ping')).toBe(0)
    })

    test('a once listener can be removed before it ever fires', () => {
      const bus = new EventEmitter<TestEvents>()
      const listener = jest.fn()
      const off = bus.once('ping', listener)

      off()
      bus.emit('ping', { n: 1 })

      expect(listener).not.toHaveBeenCalled()
    })
  })

  describe('off', () => {
    test('removes a single registration when duplicated', () => {
      const bus = new EventEmitter<TestEvents>()
      const listener = jest.fn()
      bus.on('ping', listener)
      bus.on('ping', listener)

      bus.off('ping', listener)
      bus.emit('ping', { n: 1 })

      expect(listener).toHaveBeenCalledTimes(1)
    })

    test('is a no-op for an unknown event or listener', () => {
      const bus = new EventEmitter<TestEvents>()
      expect(() => bus.off('ping', jest.fn())).not.toThrow()
    })
  })

  describe('mutation during emit', () => {
    test('a listener unsubscribing itself still runs for the current emit', () => {
      const bus = new EventEmitter<TestEvents>()
      const calls: string[] = []
      const off = bus.on('ping', () => {
        calls.push('self')
        off()
      })
      bus.on('ping', () => calls.push('other'))

      bus.emit('ping', { n: 1 })
      expect(calls).toEqual(['self', 'other'])

      calls.length = 0
      bus.emit('ping', { n: 2 })
      expect(calls).toEqual(['other'])
    })

    test('a listener added during emit does not fire for that same emit', () => {
      const bus = new EventEmitter<TestEvents>()
      const late = jest.fn()
      bus.on('ping', () => bus.on('ping', late))

      bus.emit('ping', { n: 1 })
      expect(late).not.toHaveBeenCalled()

      bus.emit('ping', { n: 2 })
      expect(late).toHaveBeenCalledTimes(1)
    })

    test('a listener removed mid-emit still runs for the in-flight dispatch', () => {
      const bus = new EventEmitter<TestEvents>()
      const second = jest.fn()
      let offSecond = () => undefined as void
      bus.on('ping', () => offSecond())
      offSecond = bus.on('ping', second)

      // The snapshot is taken before dispatch, so `second` runs this time even
      // though the earlier listener removed it mid-dispatch.
      bus.emit('ping', { n: 1 })
      expect(second).toHaveBeenCalledTimes(1)

      // On the next emit it is gone.
      bus.emit('ping', { n: 2 })
      expect(second).toHaveBeenCalledTimes(1)
    })
  })

  describe('error handling', () => {
    test('a throwing listener does not stop the others', () => {
      const onError = jest.fn()
      const bus = new EventEmitter<TestEvents>({ onError })
      const after = jest.fn()

      bus.on('ping', () => {
        throw new Error('boom')
      })
      bus.on('ping', after)

      bus.emit('ping', { n: 1 })

      expect(after).toHaveBeenCalledTimes(1)
      expect(onError).toHaveBeenCalledTimes(1)
      expect(onError.mock.calls[0][1]).toBe('ping')
    })

    test('defaults to console.error when no handler is supplied', () => {
      const spy = jest.spyOn(console, 'error').mockImplementation(() => undefined)
      const bus = new EventEmitter<TestEvents>()
      bus.on('ping', () => {
        throw new Error('boom')
      })

      bus.emit('ping', { n: 1 })

      expect(spy).toHaveBeenCalledTimes(1)
      spy.mockRestore()
    })
  })

  describe('onAny', () => {
    test('receives every event with its name and payload', () => {
      const bus = new EventEmitter<TestEvents>()
      const seen: Array<[keyof TestEvents, unknown]> = []
      bus.onAny((event, payload) => seen.push([event, payload]))

      bus.emit('ping', { n: 1 })
      bus.emit('pong', { label: 'x' })

      expect(seen).toEqual([
        ['ping', { n: 1 }],
        ['pong', { label: 'x' }],
      ])
    })

    test('does not count toward emit having listeners', () => {
      const bus = new EventEmitter<TestEvents>()
      bus.onAny(() => undefined)
      expect(bus.emit('ping', { n: 1 })).toBe(false)
    })

    test('can be detached via its handle or offAny', () => {
      const bus = new EventEmitter<TestEvents>()
      const viaHandle = jest.fn()
      const viaOff = jest.fn()
      const off = bus.onAny(viaHandle)
      bus.onAny(viaOff)

      off()
      bus.offAny(viaOff)
      bus.emit('ping', { n: 1 })

      expect(viaHandle).not.toHaveBeenCalled()
      expect(viaOff).not.toHaveBeenCalled()
    })
  })

  describe('introspection and bulk removal', () => {
    test('listenerCount and eventNames reflect current state', () => {
      const bus = new EventEmitter<TestEvents>()
      expect(bus.eventNames()).toEqual([])

      bus.on('ping', () => undefined)
      bus.on('ping', () => undefined)
      bus.on('pong', () => undefined)

      expect(bus.listenerCount('ping')).toBe(2)
      expect(bus.listenerCount('pong')).toBe(1)
      expect(bus.eventNames().sort()).toEqual(['ping', 'pong'])
    })

    test('removeAllListeners for one event leaves others intact', () => {
      const bus = new EventEmitter<TestEvents>()
      const pong = jest.fn()
      bus.on('ping', () => undefined)
      bus.on('pong', pong)

      bus.removeAllListeners('ping')

      expect(bus.listenerCount('ping')).toBe(0)
      bus.emit('pong', { label: 'x' })
      expect(pong).toHaveBeenCalledTimes(1)
    })

    test('removeAllListeners with no argument clears typed and any-listeners', () => {
      const bus = new EventEmitter<TestEvents>()
      const any = jest.fn()
      bus.on('ping', () => undefined)
      bus.onAny(any)

      bus.removeAllListeners()

      expect(bus.eventNames()).toEqual([])
      expect(bus.emit('ping', { n: 1 })).toBe(false)
      expect(any).not.toHaveBeenCalled()
    })
  })
})
