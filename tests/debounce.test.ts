import { debounce } from '../src/utils/debounce'

describe('debounce', () => {
  test('calls only the latest invocation after delay', () => {
    jest.useFakeTimers()

    const fn = jest.fn()
    const debounced = debounce(fn, 100)

    debounced('first')
    debounced('second')
    jest.advanceTimersByTime(99)
    expect(fn).not.toHaveBeenCalled()

    jest.advanceTimersByTime(1)
    expect(fn).toHaveBeenCalledTimes(1)
    expect(fn).toHaveBeenCalledWith('second')

    jest.useRealTimers()
  })

  test('clears an existing timeout even when its id is 0', () => {
    const setTimeoutSpy = jest
      .spyOn(global, 'setTimeout')
      .mockImplementation(() => 0 as ReturnType<typeof setTimeout>)
    const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout').mockImplementation(() => {})

    const fn = jest.fn()
    const debounced = debounce(fn, 100)

    debounced('first')
    debounced('second')

    expect(clearTimeoutSpy).toHaveBeenCalledWith(0)

    setTimeoutSpy.mockRestore()
    clearTimeoutSpy.mockRestore()
  })

  test('preserves `this` when invoking the wrapped function', () => {
    jest.useFakeTimers()

    const obj = {
      value: 'ok',
      fn(this: { value: string }, suffix: string) {
        spy(`${this.value}-${suffix}`)
      },
    }
    const spy = jest.fn()
    obj.fn = debounce(obj.fn, 50)

    obj.fn('done')
    jest.advanceTimersByTime(50)

    expect(spy).toHaveBeenCalledWith('ok-done')
    jest.useRealTimers()
  })

  test('treats negative delay as 0', () => {
    jest.useFakeTimers()

    const fn = jest.fn()
    const debounced = debounce(fn, -10)

    debounced('first')
    debounced('second')
    expect(fn).not.toHaveBeenCalled()

    jest.advanceTimersByTime(0)
    expect(fn).toHaveBeenCalledTimes(1)
    expect(fn).toHaveBeenCalledWith('second')

    jest.useRealTimers()
  })
})
