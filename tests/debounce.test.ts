import { debounce } from '../src/lib/debounce'

describe('debounce', () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.runOnlyPendingTimers()
    jest.useRealTimers()
  })

  test('delays function execution', () => {
    const fn = jest.fn()
    const debounced = debounce(fn, 500)

    debounced('arg1', 'arg2')
    expect(fn).not.toHaveBeenCalled()

    jest.advanceTimersByTime(499)
    expect(fn).not.toHaveBeenCalled()

    jest.advanceTimersByTime(1)
    expect(fn).toHaveBeenCalledWith('arg1', 'arg2')
  })

  test('resets delay on subsequent calls', () => {
    const fn = jest.fn()
    const debounced = debounce(fn, 500)

    debounced('first')
    jest.advanceTimersByTime(300)

    debounced('second')
    jest.advanceTimersByTime(300)
    expect(fn).not.toHaveBeenCalled()

    jest.advanceTimersByTime(200)
    expect(fn).toHaveBeenCalledOnce()
    expect(fn).toHaveBeenCalledWith('second')
  })

  test('cancel aborts pending execution', () => {
    const fn = jest.fn()
    const debounced = debounce(fn, 500)

    debounced('arg')
    jest.advanceTimersByTime(300)

    debounced.cancel()
    jest.advanceTimersByTime(300)

    expect(fn).not.toHaveBeenCalled()
  })

  test('allows multiple invocations after cancel', () => {
    const fn = jest.fn()
    const debounced = debounce(fn, 500)

    debounced('first')
    debounced.cancel()
    jest.advanceTimersByTime(500)
    expect(fn).not.toHaveBeenCalled()

    debounced('second')
    jest.advanceTimersByTime(500)
    expect(fn).toHaveBeenCalledWith('second')
  })
})
