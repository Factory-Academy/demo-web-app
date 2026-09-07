import { debounce } from '../src/utils/debounce'

describe('debounce', () => {
  jest.useFakeTimers()

  test('executes the function after the delay', () => {
    const fn = jest.fn()
    const debounced = debounce(fn, 300)

    debounced()
    expect(fn).not.toHaveBeenCalled()

    jest.advanceTimersByTime(299)
    expect(fn).not.toHaveBeenCalled()

    jest.advanceTimersByTime(1)
    expect(fn).toHaveBeenCalledTimes(1)
  })

  test('cancels prior executions when called again', () => {
    const fn = jest.fn()
    const debounced = debounce(fn, 300)

    debounced()
    jest.advanceTimersByTime(100)
    debounced()
    jest.advanceTimersByTime(100)
    debounced()

    expect(fn).not.toHaveBeenCalled()

    jest.advanceTimersByTime(300)
    expect(fn).toHaveBeenCalledTimes(1)
  })

  test('passes arguments through to the function', () => {
    const fn = jest.fn()
    const debounced = debounce(fn, 100)

    debounced('hello', 42)
    jest.advanceTimersByTime(100)

    expect(fn).toHaveBeenCalledWith('hello', 42)
  })

  test('handles multiple debounced instances independently', () => {
    const fn1 = jest.fn()
    const fn2 = jest.fn()
    const debounced1 = debounce(fn1, 100)
    const debounced2 = debounce(fn2, 200)

    debounced1()
    debounced2()
    jest.advanceTimersByTime(100)

    expect(fn1).toHaveBeenCalledTimes(1)
    expect(fn2).not.toHaveBeenCalled()

    jest.advanceTimersByTime(100)
    expect(fn2).toHaveBeenCalledTimes(1)
  })
})
