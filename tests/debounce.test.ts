import { debounce } from '../src/lib/debounce'

jest.useFakeTimers()

describe('debounce', () => {
  describe('construction', () => {
    test('rejects negative delayMs', () => {
      const fn = jest.fn()
      expect(() => debounce(fn, -1)).toThrow(RangeError)
    })

    test('rejects non-finite delayMs', () => {
      const fn = jest.fn()
      expect(() => debounce(fn, Infinity)).toThrow(RangeError)
    })

    test('accepts zero delay', () => {
      const fn = jest.fn()
      const debounced = debounce(fn, 0)
      expect(debounced).toBeDefined()
    })

    test('accepts positive delay', () => {
      const fn = jest.fn()
      const debounced = debounce(fn, 300)
      expect(debounced).toBeDefined()
    })
  })

  describe('execution', () => {
    test('delays function execution', () => {
      const fn = jest.fn()
      const debounced = debounce(fn, 300)

      debounced()
      expect(fn).not.toHaveBeenCalled()

      jest.advanceTimersByTime(299)
      expect(fn).not.toHaveBeenCalled()

      jest.advanceTimersByTime(1)
      expect(fn).toHaveBeenCalledTimes(1)
    })

    test('resets timer on subsequent calls', () => {
      const fn = jest.fn()
      const debounced = debounce(fn, 300)

      debounced()
      jest.advanceTimersByTime(200)

      debounced()
      jest.advanceTimersByTime(200)

      expect(fn).not.toHaveBeenCalled()

      jest.advanceTimersByTime(100)
      expect(fn).toHaveBeenCalledTimes(1)
    })

    test('passes arguments to the debounced function', () => {
      const fn = jest.fn()
      const debounced = debounce(fn, 100)

      debounced('arg1', 42, { key: 'value' })
      jest.advanceTimersByTime(100)

      expect(fn).toHaveBeenCalledWith('arg1', 42, { key: 'value' })
    })

    test('executes only once per debounce period', () => {
      const fn = jest.fn()
      const debounced = debounce(fn, 100)

      debounced()
      debounced()
      debounced()
      jest.advanceTimersByTime(100)

      expect(fn).toHaveBeenCalledTimes(1)
    })

    test('handles multiple separate debounce periods', () => {
      const fn = jest.fn()
      const debounced = debounce(fn, 100)

      debounced()
      jest.advanceTimersByTime(100)
      expect(fn).toHaveBeenCalledTimes(1)

      debounced()
      jest.advanceTimersByTime(100)
      expect(fn).toHaveBeenCalledTimes(2)
    })
  })

  describe('zero delay', () => {
    test('executes on the next tick with zero delay', () => {
      const fn = jest.fn()
      const debounced = debounce(fn, 0)

      debounced()
      expect(fn).not.toHaveBeenCalled()

      jest.advanceTimersByTime(0)
      expect(fn).toHaveBeenCalledTimes(1)
    })
  })
})
