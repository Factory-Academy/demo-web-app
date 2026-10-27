import { LruCache } from '../src/utils/lru-cache'

describe('LruCache', () => {
  describe('basic operations', () => {
    test('sets and gets values', () => {
      const cache = new LruCache<string, string>(10)
      cache.set('key1', 'value1')
      expect(cache.get('key1')).toBe('value1')
    })

    test('returns undefined for missing keys', () => {
      const cache = new LruCache<string, string>(10)
      expect(cache.get('missing')).toBeUndefined()
    })

    test('updates existing keys', () => {
      const cache = new LruCache<string, string>(10)
      cache.set('key1', 'value1')
      cache.set('key1', 'value2')
      expect(cache.get('key1')).toBe('value2')
      expect(cache.size()).toBe(1)
    })

    test('evicts key explicitly', () => {
      const cache = new LruCache<string, string>(10)
      cache.set('key1', 'value1')
      expect(cache.evict('key1')).toBe(true)
      expect(cache.get('key1')).toBeUndefined()
      expect(cache.evict('key1')).toBe(false)
    })

    test('clears all entries', () => {
      const cache = new LruCache<string, string>(10)
      cache.set('key1', 'value1')
      cache.set('key2', 'value2')
      cache.clear()
      expect(cache.size()).toBe(0)
      expect(cache.get('key1')).toBeUndefined()
    })

    test('tracks size correctly', () => {
      const cache = new LruCache<string, number>(10)
      expect(cache.size()).toBe(0)
      cache.set('a', 1)
      expect(cache.size()).toBe(1)
      cache.set('b', 2)
      expect(cache.size()).toBe(2)
      cache.evict('a')
      expect(cache.size()).toBe(1)
    })
  })

  describe('LRU eviction', () => {
    test('evicts least recently used item when full', () => {
      const cache = new LruCache<string, string>(3)
      cache.set('a', 'val-a')
      cache.set('b', 'val-b')
      cache.set('c', 'val-c')

      // Cache is full, next set should evict 'a' (least recently used)
      cache.set('d', 'val-d')

      expect(cache.get('a')).toBeUndefined()
      expect(cache.get('b')).toBe('val-b')
      expect(cache.get('c')).toBe('val-c')
      expect(cache.get('d')).toBe('val-d')
    })

    test('marks accessed keys as recently used', () => {
      const cache = new LruCache<string, string>(3)
      cache.set('a', 'val-a')
      cache.set('b', 'val-b')
      cache.set('c', 'val-c')

      // Access 'a' to mark it as recently used
      cache.get('a')

      // Now 'b' is the LRU item
      cache.set('d', 'val-d')

      expect(cache.get('a')).toBe('val-a')
      expect(cache.get('b')).toBeUndefined()
      expect(cache.get('c')).toBe('val-c')
      expect(cache.get('d')).toBe('val-d')
    })

    test('treats updates as recent access', () => {
      const cache = new LruCache<string, string>(3)
      cache.set('a', 'val-a')
      cache.set('b', 'val-b')
      cache.set('c', 'val-c')

      // Update 'a' to mark it as recently used
      cache.set('a', 'updated-a')

      // Now 'b' is the LRU item
      cache.set('d', 'val-d')

      expect(cache.get('a')).toBe('updated-a')
      expect(cache.get('b')).toBeUndefined()
      expect(cache.get('c')).toBe('val-c')
      expect(cache.get('d')).toBe('val-d')
    })
  })

  describe('TTL (time-to-live)', () => {
    test('expires entries after TTL', () => {
      jest.useFakeTimers()

      const cache = new LruCache<string, string>(10, 1000) // 1000ms TTL
      cache.set('key1', 'value1')

      // Before expiry
      expect(cache.get('key1')).toBe('value1')

      // Advance time past TTL
      jest.advanceTimersByTime(1001)

      // After expiry
      expect(cache.get('key1')).toBeUndefined()

      jest.useRealTimers()
    })

    test('returns undefined for expired entries without TTL set', () => {
      jest.useFakeTimers()

      const cache = new LruCache<string, string>(10) // No TTL
      cache.set('key1', 'value1')

      jest.advanceTimersByTime(10000)

      // Should still be there without TTL
      expect(cache.get('key1')).toBe('value1')

      jest.useRealTimers()
    })

    test('handles multiple entries with TTL', () => {
      jest.useFakeTimers()

      const cache = new LruCache<string, string>(10, 1000)
      cache.set('key1', 'value1')

      jest.advanceTimersByTime(500)
      cache.set('key2', 'value2')

      // key1 expires, key2 doesn't
      jest.advanceTimersByTime(501)

      expect(cache.get('key1')).toBeUndefined()
      expect(cache.get('key2')).toBe('value2')

      jest.useRealTimers()
    })

    test('refreshes TTL on get', () => {
      jest.useFakeTimers()

      const cache = new LruCache<string, string>(10, 1000)
      cache.set('key1', 'value1')

      jest.advanceTimersByTime(600)
      // Accessing the key refreshes its position but not its TTL
      cache.get('key1')

      jest.advanceTimersByTime(500)

      // TTL was set at initial set(), so now at 1100ms total, should be expired
      expect(cache.get('key1')).toBeUndefined()

      jest.useRealTimers()
    })
  })

  describe('edge cases', () => {
    test('throws on invalid maxSize', () => {
      expect(() => new LruCache<string, string>(0)).toThrow('maxSize must be at least 1')
      expect(() => new LruCache<string, string>(-1)).toThrow('maxSize must be at least 1')
    })

    test('works with maxSize of 1', () => {
      const cache = new LruCache<string, string>(1)
      cache.set('a', 'val-a')
      expect(cache.get('a')).toBe('val-a')

      cache.set('b', 'val-b')
      expect(cache.get('a')).toBeUndefined()
      expect(cache.get('b')).toBe('val-b')
    })

    test('works with different key and value types', () => {
      const cache = new LruCache<number, { id: number; name: string }>(10)
      cache.set(1, { id: 1, name: 'Alice' })
      cache.set(2, { id: 2, name: 'Bob' })

      expect(cache.get(1)).toEqual({ id: 1, name: 'Alice' })
      expect(cache.get(2)).toEqual({ id: 2, name: 'Bob' })
    })

    test('handles null and undefined values', () => {
      const cache = new LruCache<string, string | null | undefined>(10)
      cache.set('a', null)
      cache.set('b', undefined)

      // null is a valid value
      expect(cache.get('a')).toBeNull()
      // undefined indicates "not found"
      expect(cache.get('b')).toBeUndefined()
      expect(cache.get('c')).toBeUndefined()
    })
  })
})
