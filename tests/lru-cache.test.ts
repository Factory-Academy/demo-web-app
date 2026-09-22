import { LRUCache } from '../src/utils/lru-cache'

describe('LRUCache', () => {
  describe('constructor', () => {
    test('creates cache with specified max size', () => {
      const cache = new LRUCache({ maxSize: 5 })
      expect(cache.size).toBe(0)
    })

    test('throws error for invalid max size', () => {
      expect(() => new LRUCache({ maxSize: 0 })).toThrow('maxSize must be at least 1')
      expect(() => new LRUCache({ maxSize: -1 })).toThrow('maxSize must be at least 1')
    })

    test('accepts optional TTL parameter', () => {
      const cache = new LRUCache({ maxSize: 10, ttlMs: 5000 })
      expect(cache.size).toBe(0)
    })
  })

  describe('set and get', () => {
    test('stores and retrieves a value', () => {
      const cache = new LRUCache({ maxSize: 3 })
      cache.set('key1', 'value1')
      expect(cache.get('key1')).toBe('value1')
    })

    test('returns undefined for non-existent key', () => {
      const cache = new LRUCache({ maxSize: 3 })
      expect(cache.get('missing')).toBeUndefined()
    })

    test('overwrites existing key', () => {
      const cache = new LRUCache({ maxSize: 3 })
      cache.set('key1', 'value1')
      cache.set('key1', 'value2')
      expect(cache.get('key1')).toBe('value2')
      expect(cache.size).toBe(1)
    })

    test('stores objects and complex types', () => {
      const cache = new LRUCache<string, { name: string; age: number }>({ maxSize: 3 })
      const user = { name: 'Alice', age: 30 }
      cache.set('user:1', user)
      expect(cache.get('user:1')).toEqual(user)
    })

    test('increments size correctly', () => {
      const cache = new LRUCache({ maxSize: 5 })
      expect(cache.size).toBe(0)
      cache.set('k1', 'v1')
      expect(cache.size).toBe(1)
      cache.set('k2', 'v2')
      expect(cache.size).toBe(2)
    })
  })

  describe('LRU eviction', () => {
    test('evicts least recently used item when at capacity', () => {
      const cache = new LRUCache({ maxSize: 3 })
      cache.set('k1', 'v1')
      cache.set('k2', 'v2')
      cache.set('k3', 'v3')
      cache.set('k4', 'v4') // Should evict k1

      expect(cache.get('k1')).toBeUndefined()
      expect(cache.get('k2')).toBe('v2')
      expect(cache.get('k3')).toBe('v3')
      expect(cache.get('k4')).toBe('v4')
      expect(cache.size).toBe(3)
    })

    test('get operation updates recency', () => {
      const cache = new LRUCache({ maxSize: 3 })
      cache.set('k1', 'v1')
      cache.set('k2', 'v2')
      cache.set('k3', 'v3')
      cache.get('k1') // Access k1, making it most recent
      cache.set('k4', 'v4') // Should evict k2 (least recent)

      expect(cache.get('k1')).toBe('v1')
      expect(cache.get('k2')).toBeUndefined()
      expect(cache.get('k3')).toBe('v3')
      expect(cache.get('k4')).toBe('v4')
    })

    test('set operation on existing key updates recency', () => {
      const cache = new LRUCache({ maxSize: 3 })
      cache.set('k1', 'v1')
      cache.set('k2', 'v2')
      cache.set('k3', 'v3')
      cache.set('k1', 'v1-updated') // Update k1, making it most recent
      cache.set('k4', 'v4') // Should evict k2

      expect(cache.get('k1')).toBe('v1-updated')
      expect(cache.get('k2')).toBeUndefined()
      expect(cache.get('k3')).toBe('v3')
      expect(cache.get('k4')).toBe('v4')
    })

    test('maintains correct size at capacity', () => {
      const cache = new LRUCache({ maxSize: 2 })
      cache.set('k1', 'v1')
      cache.set('k2', 'v2')
      expect(cache.size).toBe(2)

      cache.set('k3', 'v3')
      expect(cache.size).toBe(2)

      cache.set('k4', 'v4')
      expect(cache.size).toBe(2)
    })
  })

  describe('TTL expiration', () => {
    beforeEach(() => {
      jest.useFakeTimers()
    })

    afterEach(() => {
      jest.useRealTimers()
    })

    test('expires entries after global TTL', () => {
      const cache = new LRUCache({ maxSize: 3, ttlMs: 1000 })
      cache.set('key1', 'value1')

      expect(cache.get('key1')).toBe('value1')

      jest.advanceTimersByTime(1001)

      expect(cache.get('key1')).toBeUndefined()
    })

    test('returns value before expiration', () => {
      const cache = new LRUCache({ maxSize: 3, ttlMs: 1000 })
      cache.set('key1', 'value1')

      jest.advanceTimersByTime(500)
      expect(cache.get('key1')).toBe('value1')

      jest.advanceTimersByTime(400)
      expect(cache.get('key1')).toBe('value1')

      jest.advanceTimersByTime(200)
      expect(cache.get('key1')).toBeUndefined()
    })

    test('supports custom TTL per entry', () => {
      const cache = new LRUCache({ maxSize: 3, ttlMs: 1000 })
      cache.set('short', 'value1', 500)
      cache.set('long', 'value2', 2000)

      jest.advanceTimersByTime(600)

      expect(cache.get('short')).toBeUndefined()
      expect(cache.get('long')).toBe('value2')

      jest.advanceTimersByTime(1500)

      expect(cache.get('long')).toBeUndefined()
    })

    test('custom TTL overrides global TTL', () => {
      const cache = new LRUCache({ maxSize: 3, ttlMs: 1000 })
      cache.set('custom', 'value', 3000)

      jest.advanceTimersByTime(1500)
      expect(cache.get('custom')).toBe('value')

      jest.advanceTimersByTime(2000)
      expect(cache.get('custom')).toBeUndefined()
    })

    test('no expiration when TTL not set', () => {
      const cache = new LRUCache({ maxSize: 3 })
      cache.set('key1', 'value1')

      jest.advanceTimersByTime(10000)

      expect(cache.get('key1')).toBe('value1')
    })

    test('expired entry is removed from cache', () => {
      const cache = new LRUCache({ maxSize: 3, ttlMs: 1000 })
      cache.set('key1', 'value1')
      expect(cache.size).toBe(1)

      jest.advanceTimersByTime(1001)
      cache.get('key1') // Trigger expiration check

      expect(cache.size).toBe(0)
    })
  })

  describe('evict', () => {
    test('removes specific key from cache', () => {
      const cache = new LRUCache({ maxSize: 3 })
      cache.set('k1', 'v1')
      cache.set('k2', 'v2')

      const result = cache.evict('k1')

      expect(result).toBe(true)
      expect(cache.get('k1')).toBeUndefined()
      expect(cache.get('k2')).toBe('v2')
      expect(cache.size).toBe(1)
    })

    test('returns false for non-existent key', () => {
      const cache = new LRUCache({ maxSize: 3 })
      cache.set('k1', 'v1')

      const result = cache.evict('missing')

      expect(result).toBe(false)
      expect(cache.size).toBe(1)
    })

    test('handles evicting from single-item cache', () => {
      const cache = new LRUCache({ maxSize: 3 })
      cache.set('only', 'value')

      cache.evict('only')

      expect(cache.size).toBe(0)
      expect(cache.get('only')).toBeUndefined()
    })

    test('maintains cache integrity after eviction', () => {
      const cache = new LRUCache({ maxSize: 3 })
      cache.set('k1', 'v1')
      cache.set('k2', 'v2')
      cache.set('k3', 'v3')

      cache.evict('k2')

      expect(cache.get('k1')).toBe('v1')
      expect(cache.get('k3')).toBe('v3')
      expect(cache.size).toBe(2)

      cache.set('k4', 'v4')
      expect(cache.get('k4')).toBe('v4')
      expect(cache.size).toBe(3)
    })
  })

  describe('clear', () => {
    test('removes all entries', () => {
      const cache = new LRUCache({ maxSize: 3 })
      cache.set('k1', 'v1')
      cache.set('k2', 'v2')
      cache.set('k3', 'v3')

      cache.clear()

      expect(cache.size).toBe(0)
      expect(cache.get('k1')).toBeUndefined()
      expect(cache.get('k2')).toBeUndefined()
      expect(cache.get('k3')).toBeUndefined()
    })

    test('allows adding entries after clear', () => {
      const cache = new LRUCache({ maxSize: 2 })
      cache.set('k1', 'v1')
      cache.clear()
      cache.set('k2', 'v2')

      expect(cache.size).toBe(1)
      expect(cache.get('k2')).toBe('v2')
    })

    test('clearing empty cache has no effect', () => {
      const cache = new LRUCache({ maxSize: 3 })
      cache.clear()

      expect(cache.size).toBe(0)
    })
  })

  describe('has', () => {
    test('returns true for existing non-expired key', () => {
      const cache = new LRUCache({ maxSize: 3 })
      cache.set('key1', 'value1')

      expect(cache.has('key1')).toBe(true)
    })

    test('returns false for non-existent key', () => {
      const cache = new LRUCache({ maxSize: 3 })
      expect(cache.has('missing')).toBe(false)
    })

    test('returns false for expired key', () => {
      jest.useFakeTimers()
      const cache = new LRUCache({ maxSize: 3, ttlMs: 1000 })
      cache.set('key1', 'value1')

      jest.advanceTimersByTime(1001)

      expect(cache.has('key1')).toBe(false)
      jest.useRealTimers()
    })
  })

  describe('complex scenarios', () => {
    test('handles rapid access pattern', () => {
      const cache = new LRUCache({ maxSize: 3 })

      // Fill cache
      cache.set('a', 1)
      cache.set('b', 2)
      cache.set('c', 3)

      // Access pattern
      cache.get('a')
      cache.get('b')
      cache.set('d', 4) // Evicts 'c'

      expect(cache.get('c')).toBeUndefined()
      expect(cache.get('a')).toBe(1)
      expect(cache.get('b')).toBe(2)
      expect(cache.get('d')).toBe(4)
    })

    test('works with numeric keys', () => {
      const cache = new LRUCache<number, string>({ maxSize: 3 })
      cache.set(1, 'one')
      cache.set(2, 'two')
      cache.set(3, 'three')
      cache.set(4, 'four')

      expect(cache.get(1)).toBeUndefined()
      expect(cache.get(2)).toBe('two')
      expect(cache.get(3)).toBe('three')
      expect(cache.get(4)).toBe('four')
    })

    test('handles cache with size 1', () => {
      const cache = new LRUCache({ maxSize: 1 })
      cache.set('a', 1)
      expect(cache.get('a')).toBe(1)

      cache.set('b', 2)
      expect(cache.get('a')).toBeUndefined()
      expect(cache.get('b')).toBe(2)
      expect(cache.size).toBe(1)
    })

    test('maintains correct order with mixed operations', () => {
      const cache = new LRUCache({ maxSize: 3 })
      cache.set('a', 1)
      cache.set('b', 2)
      cache.set('c', 3)
      cache.get('a') // a becomes most recent
      cache.set('b', 20) // b becomes most recent
      cache.set('d', 4) // Should evict c (least recent)

      expect(cache.get('c')).toBeUndefined()
      expect(cache.get('a')).toBe(1)
      expect(cache.get('b')).toBe(20)
      expect(cache.get('d')).toBe(4)
    })
  })
})
