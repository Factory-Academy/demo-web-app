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

  test('throws error for negative delay', () => {
    const fn = jest.fn()
    expect(() => debounce(fn, -1)).toThrow('Delay must be non-negative')
    expect(() => debounce(fn, -100)).toThrow('Delay must be non-negative')
  })

  test('accepts zero delay', () => {
    jest.useFakeTimers()

    const fn = jest.fn()
    const debounced = debounce(fn, 0)

    debounced('immediate')
    expect(fn).not.toHaveBeenCalled()

    jest.advanceTimersByTime(0)
    expect(fn).toHaveBeenCalledTimes(1)
    expect(fn).toHaveBeenCalledWith('immediate')

    jest.useRealTimers()
  })
})
