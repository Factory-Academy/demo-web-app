import { debounce } from '../src/utils/debounce'

describe('debounce', () => {
  test('calls the function once with the latest arguments after delay', () => {
    jest.useFakeTimers()

    const fn = jest.fn()
    const debounced = debounce(fn, 100)

    debounced('first')
    debounced('second')

    expect(fn).not.toHaveBeenCalled()

    jest.advanceTimersByTime(100)

    expect(fn).toHaveBeenCalledTimes(1)
    expect(fn).toHaveBeenCalledWith('second')

    jest.useRealTimers()
  })
})
