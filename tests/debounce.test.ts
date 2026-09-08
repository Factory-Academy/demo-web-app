import { debounce } from '../src/lib/debounce'

describe('debounce', () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  test('delays execution until wait time has passed', () => {
    const func = jest.fn()
    const debounced = debounce(func, 100)

    debounced()

    expect(func).not.toHaveBeenCalled()

    jest.advanceTimersByTime(99)
    expect(func).not.toHaveBeenCalled()

    jest.advanceTimersByTime(1)
    expect(func).toHaveBeenCalledTimes(1)
  })

  test('restarts the timer on subsequent calls', () => {
    const func = jest.fn()
    const debounced = debounce(func, 100)

    debounced()
    jest.advanceTimersByTime(50)
    debounced()
    jest.advanceTimersByTime(50)

    expect(func).not.toHaveBeenCalled()

    jest.advanceTimersByTime(50)
    expect(func).toHaveBeenCalledTimes(1)
  })

  test('passes arguments to the debounced function', () => {
    const func = jest.fn()
    const debounced = debounce(func, 100)

    debounced('hello', 42)

    jest.advanceTimersByTime(100)

    expect(func).toHaveBeenCalledWith('hello', 42)
  })

  test('uses arguments from the last call', () => {
    const func = jest.fn()
    const debounced = debounce(func, 100)

    debounced('first')
    debounced('second')
    debounced('third')

    jest.advanceTimersByTime(100)

    expect(func).toHaveBeenCalledTimes(1)
    expect(func).toHaveBeenCalledWith('third')
  })

  test('cancel stops pending execution', () => {
    const func = jest.fn()
    const debounced = debounce(func, 100)

    debounced()
    jest.advanceTimersByTime(50)
    debounced.cancel()
    jest.advanceTimersByTime(100)

    expect(func).not.toHaveBeenCalled()
  })

  test('cancel is safe to call multiple times', () => {
    const func = jest.fn()
    const debounced = debounce(func, 100)

    debounced()
    debounced.cancel()
    debounced.cancel()

    jest.advanceTimersByTime(100)

    expect(func).not.toHaveBeenCalled()
  })

  test('works with multiple independent debounced functions', () => {
    const func1 = jest.fn()
    const func2 = jest.fn()
    const debounced1 = debounce(func1, 100)
    const debounced2 = debounce(func2, 200)

    debounced1()
    debounced2()

    jest.advanceTimersByTime(100)
    expect(func1).toHaveBeenCalledTimes(1)
    expect(func2).not.toHaveBeenCalled()

    jest.advanceTimersByTime(100)
    expect(func2).toHaveBeenCalledTimes(1)
  })

  test('clamps negative wait time to zero', () => {
    const func = jest.fn()
    const debounced = debounce(func, -100)

    debounced()

    expect(func).not.toHaveBeenCalled()

    jest.advanceTimersByTime(0)
    expect(func).toHaveBeenCalledTimes(1)
  })

  test('handles zero wait time', () => {
    const func = jest.fn()
    const debounced = debounce(func, 0)

    debounced()

    expect(func).not.toHaveBeenCalled()

    jest.advanceTimersByTime(0)
    expect(func).toHaveBeenCalledTimes(1)
  })

  test('throws TypeError when first argument is not a function', () => {
    expect(() => debounce(null as any, 100)).toThrow(TypeError)
    expect(() => debounce(undefined as any, 100)).toThrow(TypeError)
    expect(() => debounce('not a function' as any, 100)).toThrow(TypeError)
    expect(() => debounce(42 as any, 100)).toThrow(TypeError)
  })
})
