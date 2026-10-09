import { debounce } from '../src/utils/debounce'

describe('debounce', () => {
  test('calls the callback once with the latest arguments after delay', () => {
    jest.useFakeTimers()
    const callback = jest.fn()
    const debounced = debounce(callback, 100)

    debounced('first')
    debounced('second')

    expect(callback).not.toHaveBeenCalled()

    jest.advanceTimersByTime(100)

    expect(callback).toHaveBeenCalledTimes(1)
    expect(callback).toHaveBeenCalledWith('second')
  })
})
