import {
  EmitterError,
  ListenerInvocationError,
  TypedEventEmitter,
  WaitAbortedError,
  WaitTimeoutError,
} from '../../src/lib/events'

interface Events {
  ping: { at: number }
  message: string
  done: void
}

describe('TypedEventEmitter — basic pub/sub', () => {
  test('delivers payloads to subscribed listeners', () => {
    const bus = new TypedEventEmitter<Events>()
    const received: string[] = []
    bus.on('message', (m) => received.push(m))

    expect(bus.emit('message', 'hello')).toBe(true)
    expect(bus.emit('message', 'world')).toBe(true)
    expect(received).toEqual(['hello', 'world'])
  })

  test('emit returns false when no listener is registered', () => {
    const bus = new TypedEventEmitter<Events>()
    expect(bus.emit('ping', { at: 1 })).toBe(false)
  })

  test('invokes listeners in subscription order', () => {
    const bus = new TypedEventEmitter<Events>()
    const order: number[] = []
    bus.on('done', () => order.push(1))
    bus.on('done', () => order.push(2))
    bus.on('done', () => order.push(3))

    bus.emit('done', undefined)
    expect(order).toEqual([1, 2, 3])
  })

  test('the same function subscribed twice fires twice', () => {
    const bus = new TypedEventEmitter<Events>()
    const fn = jest.fn()
    bus.on('message', fn)
    bus.on('message', fn)

    bus.emit('message', 'x')
    expect(fn).toHaveBeenCalledTimes(2)
  })
})

describe('TypedEventEmitter — unsubscribe', () => {
  test('unsubscribe handle detaches exactly one subscription', () => {
    const bus = new TypedEventEmitter<Events>()
    const fn = jest.fn()
    const off1 = bus.on('message', fn)
    bus.on('message', fn)

    off1()
    bus.emit('message', 'x')
    expect(fn).toHaveBeenCalledTimes(1)
    expect(bus.listenerCount('message')).toBe(1)
  })

  test('off removes every registration of the listener', () => {
    const bus = new TypedEventEmitter<Events>()
    const fn = jest.fn()
    bus.on('message', fn)
    bus.on('message', fn)

    bus.off('message', fn)
    bus.emit('message', 'x')
    expect(fn).not.toHaveBeenCalled()
    expect(bus.listenerCount('message')).toBe(0)
  })

  test('off and double-unsubscribe are safe no-ops', () => {
    const bus = new TypedEventEmitter<Events>()
    const fn = jest.fn()
    const off = bus.on('message', fn)

    off()
    expect(() => off()).not.toThrow()
    expect(() => bus.off('message', fn)).not.toThrow()
    expect(() => bus.off('ping', jest.fn())).not.toThrow()
  })
})

describe('TypedEventEmitter — once', () => {
  test('fires at most once', () => {
    const bus = new TypedEventEmitter<Events>()
    const fn = jest.fn()
    bus.once('message', fn)

    bus.emit('message', 'a')
    bus.emit('message', 'b')
    expect(fn).toHaveBeenCalledTimes(1)
    expect(fn).toHaveBeenCalledWith('a')
    expect(bus.listenerCount('message')).toBe(0)
  })

  test('once can be cancelled before it fires', () => {
    const bus = new TypedEventEmitter<Events>()
    const fn = jest.fn()
    const off = bus.once('message', fn)

    off()
    bus.emit('message', 'a')
    expect(fn).not.toHaveBeenCalled()
  })

  test('re-emitting from inside a once listener does not re-invoke it', () => {
    const bus = new TypedEventEmitter<Events>()
    let calls = 0
    bus.once('message', () => {
      calls++
      if (calls < 3) bus.emit('message', 'again')
    })

    bus.emit('message', 'start')
    expect(calls).toBe(1)
  })
})

describe('TypedEventEmitter — re-entrancy safety', () => {
  test('a listener added during emit does not run in the same emit', () => {
    const bus = new TypedEventEmitter<Events>()
    const added = jest.fn()
    bus.on('done', () => bus.on('done', added))

    bus.emit('done', undefined)
    expect(added).not.toHaveBeenCalled()

    bus.emit('done', undefined)
    expect(added).toHaveBeenCalledTimes(1)
  })

  test('a listener removed during emit is skipped if not yet called', () => {
    const bus = new TypedEventEmitter<Events>()
    const second = jest.fn()
    bus.on('done', () => bus.off('done', second))
    bus.on('done', second)

    bus.emit('done', undefined)
    expect(second).not.toHaveBeenCalled()
  })

  test('all original listeners still receive the payload despite mutation', () => {
    const bus = new TypedEventEmitter<Events>()
    const seen: string[] = []
    bus.on('message', (m) => {
      seen.push(`a:${m}`)
      bus.on('message', (n) => seen.push(`late:${n}`))
    })
    bus.on('message', (m) => seen.push(`b:${m}`))

    bus.emit('message', '1')
    expect(seen).toEqual(['a:1', 'b:1'])
  })

  test('a once listener detached during emit before its turn does not fire', () => {
    const bus = new TypedEventEmitter<Events>()
    const second = jest.fn()
    bus.on('done', () => bus.off('done', second))
    bus.once('done', second)

    bus.emit('done', undefined)
    expect(second).not.toHaveBeenCalled()
    expect(bus.listenerCount('done')).toBe(1)
  })

  test('a once listener cancelled via its handle during emit does not fire', () => {
    const bus = new TypedEventEmitter<Events>()
    const second = jest.fn()
    let off: () => void = () => {}
    bus.on('done', () => off())
    off = bus.once('done', second)

    bus.emit('done', undefined)
    expect(second).not.toHaveBeenCalled()
  })

  test('removeAllListeners during emit cancels listeners not yet called', () => {
    const bus = new TypedEventEmitter<Events>()
    const second = jest.fn()
    const third = jest.fn()
    bus.on('done', () => bus.removeAllListeners('done'))
    bus.on('done', second)
    bus.once('done', third)

    bus.emit('done', undefined)
    expect(second).not.toHaveBeenCalled()
    expect(third).not.toHaveBeenCalled()
    expect(bus.listenerCount('done')).toBe(0)
  })

  test('clearing then re-subscribing during emit keeps the fresh listener', () => {
    const bus = new TypedEventEmitter<Events>()
    const late = jest.fn()
    bus.on('message', () => {
      bus.removeAllListeners('message')
      bus.on('message', late)
    })
    bus.on('message', jest.fn())

    bus.emit('message', '1')
    expect(late).not.toHaveBeenCalled()
    expect(bus.listenerCount('message')).toBe(1)

    bus.emit('message', '2')
    expect(late).toHaveBeenCalledTimes(1)
    expect(late).toHaveBeenCalledWith('2')
  })
})

describe('TypedEventEmitter — listener errors', () => {
  test('a throwing listener does not stop the others', () => {
    const bus = new TypedEventEmitter<Events>({ onError: jest.fn() })
    const after = jest.fn()
    bus.on('done', () => {
      throw new Error('boom')
    })
    bus.on('done', after)

    bus.emit('done', undefined)
    expect(after).toHaveBeenCalledTimes(1)
  })

  test('errors are routed to onError with context', () => {
    const onError = jest.fn()
    const bus = new TypedEventEmitter<Events>({ onError })
    const err = new Error('boom')
    bus.on('message', () => {
      throw err
    })

    bus.emit('message', 'payload')
    expect(onError).toHaveBeenCalledTimes(1)
    expect(onError).toHaveBeenCalledWith(err, { event: 'message', payload: 'payload' })
  })

  test('without onError the first error is rethrown after all listeners run', () => {
    const bus = new TypedEventEmitter<Events>()
    const after = jest.fn()
    bus.on('done', () => {
      throw new Error('first')
    })
    bus.on('done', () => {
      throw new Error('second')
    })
    bus.on('done', after)

    let caught: unknown
    try {
      bus.emit('done', undefined)
    } catch (e) {
      caught = e
    }
    expect(after).toHaveBeenCalledTimes(1)
    expect(caught).toBeInstanceOf(ListenerInvocationError)
    expect((caught as ListenerInvocationError).event).toBe('done')
    expect((caught as ListenerInvocationError).cause).toEqual(new Error('first'))
    expect(caught).toBeInstanceOf(EmitterError)
  })
})

describe('TypedEventEmitter — introspection', () => {
  test('listenerCount, listeners, and eventNames reflect state', () => {
    const bus = new TypedEventEmitter<Events>()
    const a = jest.fn()
    const b = jest.fn()
    bus.on('message', a)
    bus.on('message', b)
    bus.on('ping', jest.fn())

    expect(bus.listenerCount('message')).toBe(2)
    expect(bus.listeners('message')).toEqual([a, b])
    expect(bus.eventNames().sort()).toEqual(['message', 'ping'])
  })

  test('listeners snapshot is detached from internal state', () => {
    const bus = new TypedEventEmitter<Events>()
    bus.on('message', jest.fn())
    const snap = bus.listeners('message')
    snap.pop()
    expect(bus.listenerCount('message')).toBe(1)
  })

  test('removeAllListeners clears one event or all events', () => {
    const bus = new TypedEventEmitter<Events>()
    bus.on('message', jest.fn())
    bus.on('ping', jest.fn())

    bus.removeAllListeners('message')
    expect(bus.listenerCount('message')).toBe(0)
    expect(bus.listenerCount('ping')).toBe(1)

    bus.removeAllListeners()
    expect(bus.eventNames()).toEqual([])
  })
})

describe('TypedEventEmitter — max listeners', () => {
  test('warns once the soft cap is exceeded', () => {
    const onWarning = jest.fn()
    const bus = new TypedEventEmitter<Events>({ maxListeners: 2, onWarning })

    bus.on('message', jest.fn())
    bus.on('message', jest.fn())
    expect(onWarning).not.toHaveBeenCalled()

    bus.on('message', jest.fn())
    expect(onWarning).toHaveBeenCalledTimes(1)
    expect(onWarning.mock.calls[0][0]).toContain('message')
  })

  test('maxListeners 0 disables the warning', () => {
    const onWarning = jest.fn()
    const bus = new TypedEventEmitter<Events>({ maxListeners: 0, onWarning })
    for (let i = 0; i < 50; i++) bus.on('message', jest.fn())
    expect(onWarning).not.toHaveBeenCalled()
  })

  test('setMaxListeners / getMaxListeners round-trip and validate', () => {
    const bus = new TypedEventEmitter<Events>()
    expect(bus.getMaxListeners()).toBe(10)
    bus.setMaxListeners(3)
    expect(bus.getMaxListeners()).toBe(3)
    expect(() => bus.setMaxListeners(-1)).toThrow(RangeError)
    expect(() => bus.setMaxListeners(1.5)).toThrow(RangeError)
  })

  test('invalid maxListeners in the constructor throws', () => {
    expect(() => new TypedEventEmitter<Events>({ maxListeners: -5 })).toThrow(RangeError)
  })
})

describe('TypedEventEmitter — AbortSignal subscriptions', () => {
  test('aborting detaches the listener', () => {
    const bus = new TypedEventEmitter<Events>()
    const controller = new AbortController()
    const fn = jest.fn()
    bus.on('message', fn, { signal: controller.signal })

    bus.emit('message', 'a')
    controller.abort()
    bus.emit('message', 'b')

    expect(fn).toHaveBeenCalledTimes(1)
    expect(bus.listenerCount('message')).toBe(0)
  })

  test('an already-aborted signal never attaches the listener', () => {
    const bus = new TypedEventEmitter<Events>()
    const controller = new AbortController()
    controller.abort()
    const fn = jest.fn()

    const off = bus.on('message', fn, { signal: controller.signal })
    bus.emit('message', 'a')
    expect(fn).not.toHaveBeenCalled()
    expect(bus.listenerCount('message')).toBe(0)
    expect(() => off()).not.toThrow()
  })
})

describe('TypedEventEmitter — waitFor', () => {
  test('resolves with the next payload', async () => {
    const bus = new TypedEventEmitter<Events>()
    const promise = bus.waitFor('ping')
    bus.emit('ping', { at: 42 })
    await expect(promise).resolves.toEqual({ at: 42 })
    expect(bus.listenerCount('ping')).toBe(0)
  })

  test('rejects when the abort signal fires', async () => {
    const bus = new TypedEventEmitter<Events>()
    const controller = new AbortController()
    const promise = bus.waitFor('ping', { signal: controller.signal })
    controller.abort()
    await expect(promise).rejects.toBeInstanceOf(WaitAbortedError)
    expect(bus.listenerCount('ping')).toBe(0)
  })

  test('rejects immediately for an already-aborted signal', async () => {
    const bus = new TypedEventEmitter<Events>()
    const controller = new AbortController()
    controller.abort()
    await expect(bus.waitFor('ping', { signal: controller.signal })).rejects.toBeInstanceOf(
      WaitAbortedError,
    )
  })

  test('rejects on timeout and cleans up', async () => {
    jest.useFakeTimers()
    const bus = new TypedEventEmitter<Events>()
    const promise = bus.waitFor('ping', { timeoutMs: 100 })
    const assertion = expect(promise).rejects.toBeInstanceOf(WaitTimeoutError)

    jest.advanceTimersByTime(100)
    await assertion
    expect(bus.listenerCount('ping')).toBe(0)
    jest.useRealTimers()
  })

  test('a resolved wait ignores a later timeout', async () => {
    jest.useFakeTimers()
    const bus = new TypedEventEmitter<Events>()
    const promise = bus.waitFor('ping', { timeoutMs: 100 })

    bus.emit('ping', { at: 1 })
    jest.advanceTimersByTime(500)

    await expect(promise).resolves.toEqual({ at: 1 })
    jest.useRealTimers()
  })

  test('rejects with RangeError for a non-positive timeout', async () => {
    const bus = new TypedEventEmitter<Events>()
    await expect(bus.waitFor('ping', { timeoutMs: 0 })).rejects.toBeInstanceOf(RangeError)
  })
})
