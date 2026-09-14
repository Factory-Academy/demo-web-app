import { debounce } from '../src/utils/debounce'

describe('debounce', () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.runOnlyPendingTimers()
    jest.useRealTimers()
  })

  test('delays function execution', () => {
    const mockFn = jest.fn()
    const debouncedFn = debounce(mockFn, 300)

    debouncedFn('test')
    
    expect(mockFn).not.toHaveBeenCalled()
    
    jest.advanceTimersByTime(300)
    
    expect(mockFn).toHaveBeenCalledTimes(1)
    expect(mockFn).toHaveBeenCalledWith('test')
  })

  test('resets delay on subsequent calls', () => {
    const mockFn = jest.fn()
    const debouncedFn = debounce(mockFn, 300)

    debouncedFn('first')
    jest.advanceTimersByTime(100)
    
    debouncedFn('second')
    jest.advanceTimersByTime(100)
    
    debouncedFn('third')
    jest.advanceTimersByTime(100)
    
    expect(mockFn).not.toHaveBeenCalled()
    
    jest.advanceTimersByTime(200)
    
    expect(mockFn).toHaveBeenCalledTimes(1)
    expect(mockFn).toHaveBeenCalledWith('third')
  })

  test('handles multiple arguments', () => {
    const mockFn = jest.fn()
    const debouncedFn = debounce(mockFn, 300)

    debouncedFn('arg1', 'arg2', 'arg3')
    jest.advanceTimersByTime(300)
    
    expect(mockFn).toHaveBeenCalledWith('arg1', 'arg2', 'arg3')
  })

  test('executes separately for each debounced instance', () => {
    const mockFn1 = jest.fn()
    const mockFn2 = jest.fn()
    const debouncedFn1 = debounce(mockFn1, 300)
    const debouncedFn2 = debounce(mockFn2, 300)

    debouncedFn1('first')
    debouncedFn2('second')
    
    jest.advanceTimersByTime(300)
    
    expect(mockFn1).toHaveBeenCalledWith('first')
    expect(mockFn2).toHaveBeenCalledWith('second')
  })

  test('respects different wait times', () => {
    const mockFn = jest.fn()
    const debouncedFn = debounce(mockFn, 500)

    debouncedFn('test')
    jest.advanceTimersByTime(300)
    
    expect(mockFn).not.toHaveBeenCalled()
    
    jest.advanceTimersByTime(200)
    
    expect(mockFn).toHaveBeenCalledTimes(1)
  })
})
