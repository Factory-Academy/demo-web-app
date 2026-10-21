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
})
