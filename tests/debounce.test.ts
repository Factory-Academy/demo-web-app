import { debounce } from '../src/utils/debounce'

describe('debounce', () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  test('delays function execution', () => {
    const func = jest.fn()
    const debounced = debounce(func, 100)

    debounced()
    expect(func).not.toHaveBeenCalled()

    jest.advanceTimersByTime(100)
    expect(func).toHaveBeenCalledTimes(1)
  })

  test('cancels previous invocation when called again', () => {
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

    debounced('test', 123)
    jest.advanceTimersByTime(100)

    expect(func).toHaveBeenCalledWith('test', 123)
  })

  test('uses the most recent arguments', () => {
    const func = jest.fn()
    const debounced = debounce(func, 100)

    debounced('first')
    jest.advanceTimersByTime(50)
    debounced('second')
    jest.advanceTimersByTime(100)

    expect(func).toHaveBeenCalledTimes(1)
    expect(func).toHaveBeenCalledWith('second')
  })
})
