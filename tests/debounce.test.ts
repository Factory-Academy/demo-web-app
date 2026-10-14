import { debounce } from '../src/utils/debounce'

describe('debounce', () => {
  jest.useFakeTimers()

  test('delays function execution', () => {
    const mockFn = jest.fn()
    const debouncedFn = debounce(mockFn, 300)

    debouncedFn()
    expect(mockFn).not.toHaveBeenCalled()

    jest.advanceTimersByTime(300)
    expect(mockFn).toHaveBeenCalledTimes(1)
  })

  test('resets delay on multiple calls', () => {
    const mockFn = jest.fn()
    const debouncedFn = debounce(mockFn, 300)

    debouncedFn()
    jest.advanceTimersByTime(100)
    debouncedFn()
    jest.advanceTimersByTime(100)
    debouncedFn()

    expect(mockFn).not.toHaveBeenCalled()

    jest.advanceTimersByTime(300)
    expect(mockFn).toHaveBeenCalledTimes(1)
  })

  test('passes arguments to the function', () => {
    const mockFn = jest.fn()
    const debouncedFn = debounce(mockFn, 200)

    debouncedFn('test', 42)
    jest.advanceTimersByTime(200)

    expect(mockFn).toHaveBeenCalledWith('test', 42)
  })

  test('throws error for negative delay', () => {
    const mockFn = jest.fn()

    expect(() => debounce(mockFn, -100)).toThrow('Debounce delay must be non-negative')
  })

  test('handles zero delay', () => {
    const mockFn = jest.fn()
    const debouncedFn = debounce(mockFn, 0)

    debouncedFn()
    expect(mockFn).not.toHaveBeenCalled()

    jest.advanceTimersByTime(0)
    expect(mockFn).toHaveBeenCalledTimes(1)
  })
})
