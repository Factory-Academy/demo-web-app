import {
  createEmitter,
  ListenerDispatchError,
  TypedEmitter,
} from '@/lib/events'

/** A small event map used across the suite. */
interface TestEvents {
  ping: { n: number }
  message: string
  done: void
}

function newEmitter(options?: ConstructorParameters<typeof TypedEmitter>[0]) {
  return new TypedEmitter<TestEvents>(options)
}

describe('TypedEmitter — subscribe & emit', () => {
  test('delivers the payload to a listener and reports the count', () => {
    const emitter = newEmitter()
    const seen: number[] = []
    emitter.on('ping', (p) => seen.push(p.n))

    expect(emitter.emit('ping', { n: 7 })).toBe(1)
    expect(seen).toEqual([7])
  })

  test('emitting an event with no listeners is a no-op returning 0', () => {
    const emitter = newEmitter()
    expect(emitter.emit('ping', { n: 1 })).toBe(0)
  })

  test('invokes multiple listeners in registration order', () => {
    const emitter = newEmitter()
    const order: string[] = []
    emitter.on('message', () => order.push('a'))
    emitter.on('message', () => order.push('b'))
    emitter.on('message', () => order.push('c'))

    emitter.emit('message', 'hi')
    expect(order).toEqual(['a', 'b', 'c'])
  })

  test('the same function subscribed twice is invoked twice', () => {
    const emitter = newEmitter()
    const fn = jest.fn()
    emitter.on('done', fn)
    emitter.on('done', fn)

    expect(emitter.listenerCount('done')).toBe(2)
    emitter.emit('done', undefined)
    expect(fn).toHaveBeenCalledTimes(2)
  })

  test('createEmitter returns an equivalent instance', () => {
    const emitter = createEmitter<TestEvents>()
    expect(emitter).toBeInstanceOf(TypedEmitter)
  })
})

describe('TypedEmitter — unsubscribe', () => {
  test('the handle from on() removes the listener and is idempotent', () => {
    const emitter = newEmitter()
    const fn = jest.fn()
    const off = emitter.on('done', fn)

    off()
    off() // second call is a safe no-op
    emitter.emit('done', undefined)
    expect(fn).not.toHaveBeenCalled()
    expect(emitter.listenerCount('done')).toBe(0)
  })

  test('the handle removes only its own registration of a repeated function', () => {
    const emitter = newEmitter()
    const fn = jest.fn()
    const off1 = emitter.on('done', fn)
    emitter.on('done', fn)

    off1()
    expect(emitter.listenerCount('done')).toBe(1)
    emitter.emit('done', undefined)
    expect(fn).toHaveBeenCalledTimes(1)
  })

  test('off() removes the first matching listener; unknown listeners are ignored', () => {
    const emitter = newEmitter()
    const fn = jest.fn()
    emitter.on('done', fn)

    emitter.off('done', () => undefined) // not attached — no throw
    expect(emitter.listenerCount('done')).toBe(1)

    emitter.off('done', fn)
    expect(emitter.listenerCount('done')).toBe(0)
  })
})

describe('TypedEmitter — once & waitFor', () => {
  test('once fires at most a single time', () => {
    const emitter = newEmitter()
    const fn = jest.fn()
    emitter.once('ping', fn)

    emitter.emit('ping', { n: 1 })
    emitter.emit('ping', { n: 2 })
    expect(fn).toHaveBeenCalledTimes(1)
    expect(fn).toHaveBeenCalledWith({ n: 1 })
    expect(emitter.listenerCount('ping')).toBe(0)
  })

  test('a once listener re-emitting its own event does not re-trigger itself', () => {
    const emitter = newEmitter()
    let calls = 0
    emitter.once('ping', () => {
      calls++
      if (calls < 5) emitter.emit('ping', { n: calls })
    })

    emitter.emit('ping', { n: 0 })
    expect(calls).toBe(1)
  })

  test('a once handle can be cancelled before it fires', () => {
    const emitter = newEmitter()
    const fn = jest.fn()
    const off = emitter.once('done', fn)
    off()
    emitter.emit('done', undefined)
    expect(fn).not.toHaveBeenCalled()
  })

  test('waitFor resolves with the next payload', async () => {
    const emitter = newEmitter()
    const pending = emitter.waitFor('message')
    emitter.emit('message', 'hello')
    await expect(pending).resolves.toBe('hello')
  })
})

describe('TypedEmitter — mutation during dispatch', () => {
  test('a listener added during emit is not called in the same round', () => {
    const emitter = newEmitter()
    const late = jest.fn()
    emitter.on('done', () => emitter.on('done', late))

    emitter.emit('done', undefined)
    expect(late).not.toHaveBeenCalled()

    emitter.emit('done', undefined)
    expect(late).toHaveBeenCalledTimes(1)
  })

  test('a listener removed during emit still runs for the in-flight round', () => {
    const emitter = newEmitter()
    const b = jest.fn()
    // `a` removes `b`, but the current dispatch iterates a snapshot.
    emitter.on('done', () => emitter.off('done', b))
    emitter.on('done', b)

    emitter.emit('done', undefined)
    expect(b).toHaveBeenCalledTimes(1)

    emitter.emit('done', undefined)
    expect(b).toHaveBeenCalledTimes(1) // not called again
  })
})

describe('TypedEmitter — listener errors', () => {
  test('without onError, a single throwing listener re-throws the original error', () => {
    const emitter = newEmitter()
    const boom = new Error('boom')
    emitter.on('done', () => {
      throw boom
    })
    expect(() => emitter.emit('done', undefined)).toThrow(boom)
  })

  test('without onError, remaining listeners still run and errors aggregate', () => {
    const emitter = newEmitter()
    const after = jest.fn()
    emitter.on('done', () => {
      throw new Error('first')
    })
    emitter.on('done', () => {
      throw new Error('second')
    })
    emitter.on('done', after)

    const error = (() => {
      try {
        emitter.emit('done', undefined)
      } catch (e) {
        return e
      }
    })()

    expect(after).toHaveBeenCalledTimes(1)
    expect(error).toBeInstanceOf(ListenerDispatchError)
    expect((error as ListenerDispatchError).errors).toHaveLength(2)
  })

  test('with onError, every listener runs and errors are routed, not thrown', () => {
    const onError = jest.fn()
    const emitter = newEmitter({ onError })
    const after = jest.fn()
    emitter.on('ping', () => {
      throw new Error('x')
    })
    emitter.on('ping', after)

    expect(emitter.emit('ping', { n: 1 })).toBe(2)
    expect(after).toHaveBeenCalledTimes(1)
    expect(onError).toHaveBeenCalledTimes(1)
    expect(onError).toHaveBeenCalledWith(expect.any(Error), 'ping', { n: 1 })
  })
})

describe('TypedEmitter — introspection & bulk removal', () => {
  test('listeners() returns a defensive copy', () => {
    const emitter = newEmitter()
    const fn = jest.fn()
    emitter.on('done', fn)

    const list = emitter.listeners('done')
    list.push(jest.fn())
    expect(emitter.listenerCount('done')).toBe(1)
  })

  test('eventNames() reflects events with active listeners', () => {
    const emitter = newEmitter()
    emitter.on('ping', jest.fn())
    emitter.on('message', jest.fn())
    expect(emitter.eventNames().sort()).toEqual(['message', 'ping'])
  })

  test('removeAllListeners clears a single event or everything', () => {
    const emitter = newEmitter()
    emitter.on('ping', jest.fn())
    emitter.on('message', jest.fn())

    emitter.removeAllListeners('ping')
    expect(emitter.listenerCount('ping')).toBe(0)
    expect(emitter.listenerCount('message')).toBe(1)

    emitter.removeAllListeners()
    expect(emitter.eventNames()).toEqual([])
  })
})

describe('TypedEmitter — options & validation', () => {
  test('warns through onWarning once the listener cap is exceeded', () => {
    const onWarning = jest.fn()
    const emitter = newEmitter({ maxListeners: 2, onWarning })
    emitter.on('done', jest.fn())
    emitter.on('done', jest.fn())
    expect(onWarning).not.toHaveBeenCalled()
    emitter.on('done', jest.fn())
    expect(onWarning).toHaveBeenCalledTimes(1)
  })

  test('maxListeners: 0 disables the leak warning', () => {
    const onWarning = jest.fn()
    const emitter = newEmitter({ maxListeners: 0, onWarning })
    for (let i = 0; i < 50; i++) emitter.on('done', jest.fn())
    expect(onWarning).not.toHaveBeenCalled()
  })

  test('rejects an invalid maxListeners', () => {
    expect(() => newEmitter({ maxListeners: -1 })).toThrow(RangeError)
    expect(() => newEmitter({ maxListeners: 1.5 })).toThrow(RangeError)
  })

  test('rejects a non-function listener', () => {
    const emitter = newEmitter()
    expect(() =>
      emitter.on('done', undefined as unknown as () => void),
    ).toThrow(TypeError)
  })
})
