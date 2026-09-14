import { LRUCache } from '../src/utils/lru-cache'

describe('LRUCache', () => {
  describe('constructor', () => {
    test('creates cache with default max size of 100', () => {
      const cache = new LRUCache<string>()
      expect(cache.size()).toBe(0)
    })

    test('creates cache with custom max size', () => {
      const cache = new LRUCache<string>({ maxSize: 50 })
      expect(cache.size()).toBe(0)
    })

    test('creates cache with TTL option', () => {
      const cache = new LRUCache<string>({ maxSize: 10, ttlMs: 1000 })
      expect(cache.size()).toBe(0)
    })

    test('throws error if maxSize is 0 or negative', () => {
      expect(() => new LRUCache({ maxSize: 0 })).toThrow('maxSize must be greater than 0')
      expect(() => new LRUCache({ maxSize: -1 })).toThrow('maxSize must be greater than 0')
    })
  })

  describe('get/set operations', () => {
    test('sets and retrieves a value', () => {
      const cache = new LRUCache<string>()
      cache.set('key1', 'value1')
      expect(cache.get('key1')).toBe('value1')
    })

    test('returns undefined for non-existent key', () => {
      const cache = new LRUCache<string>()
      expect(cache.get('nonexistent')).toBeUndefined()
    })

    test('handles multiple key-value pairs', () => {
      const cache = new LRUCache<string>()
      cache.set('key1', 'value1')
      cache.set('key2', 'value2')
      cache.set('key3', 'value3')
      expect(cache.get('key1')).toBe('value1')
      expect(cache.get('key2')).toBe('value2')
      expect(cache.get('key3')).toBe('value3')
      expect(cache.size()).toBe(3)
    })

    test('overwrites existing value', () => {
      const cache = new LRUCache<string>()
      cache.set('key1', 'value1')
      cache.set('key1', 'value2')
      expect(cache.get('key1')).toBe('value2')
      expect(cache.size()).toBe(1)
    })

    test('works with different data types', () => {
      const cache = new LRUCache<{ id: number; name: string }>()
      const obj = { id: 1, name: 'test' }
      cache.set('obj1', obj)
      expect(cache.get('obj1')).toEqual(obj)
    })

    test('works with numbers', () => {
      const cache = new LRUCache<number>()
      cache.set('num1', 42)
      expect(cache.get('num1')).toBe(42)
    })
  })

  describe('LRU eviction', () => {
    test('evicts least recently used entry when max size is reached', () => {
      const cache = new LRUCache<string>({ maxSize: 3 })
      cache.set('key1', 'value1')
      cache.set('key2', 'value2')
      cache.set('key3', 'value3')
      expect(cache.size()).toBe(3)

      // Adding a new entry should evict the least recently used (key1)
      cache.set('key4', 'value4')
      expect(cache.size()).toBe(3)
      expect(cache.get('key1')).toBeUndefined()
      expect(cache.get('key4')).toBe('value4')
    })

    test('updates access order on get operation', () => {
      const cache = new LRUCache<string>({ maxSize: 3 })
      cache.set('key1', 'value1')
      cache.set('key2', 'value2')
      cache.set('key3', 'value3')

      // Access key1 to mark it as recently used
      cache.get('key1')

      // Add new entry, should evict key2 (least recently used now)
      cache.set('key4', 'value4')
      expect(cache.get('key1')).toBe('value1')
      expect(cache.get('key2')).toBeUndefined()
      expect(cache.get('key4')).toBe('value4')
    })

    test('evicts LRU entry even with multiple accesses', () => {
      const cache = new LRUCache<string>({ maxSize: 3 })
      cache.set('key1', 'value1')
      cache.set('key2', 'value2')
      cache.set('key3', 'value3')

      // Access key1 and key2 to keep them hot
      cache.get('key1')
      cache.get('key2')

      // key3 is LRU, should be evicted
      cache.set('key4', 'value4')
      expect(cache.get('key3')).toBeUndefined()
      expect(cache.get('key1')).toBe('value1')
      expect(cache.get('key2')).toBe('value2')
      expect(cache.get('key4')).toBe('value4')
    })
  })

  describe('evict method', () => {
    test('removes a specific entry', () => {
      const cache = new LRUCache<string>()
      cache.set('key1', 'value1')
      cache.set('key2', 'value2')
      expect(cache.evict('key1')).toBe(true)
      expect(cache.get('key1')).toBeUndefined()
      expect(cache.get('key2')).toBe('value2')
      expect(cache.size()).toBe(1)
    })

    test('returns false when evicting non-existent key', () => {
      const cache = new LRUCache<string>()
      expect(cache.evict('nonexistent')).toBe(false)
    })

    test('frees space for new entries after evict', () => {
      const cache = new LRUCache<string>({ maxSize: 2 })
      cache.set('key1', 'value1')
      cache.set('key2', 'value2')

      cache.evict('key1')
      cache.set('key3', 'value3')
      expect(cache.size()).toBe(2)
      expect(cache.get('key2')).toBe('value2')
      expect(cache.get('key3')).toBe('value3')
    })
  })

  describe('TTL (Time-To-Live) expiration', () => {
    test('returns undefined for expired entries', async () => {
      const cache = new LRUCache<string>({ ttlMs: 100 })
      cache.set('key1', 'value1')
      expect(cache.get('key1')).toBe('value1')

      // Wait for expiration
      await new Promise((resolve) => setTimeout(resolve, 150))
      expect(cache.get('key1')).toBeUndefined()
    })

    test('removes expired entry from cache', async () => {
      const cache = new LRUCache<string>({ ttlMs: 80 })
      cache.set('key1', 'value1')
      // Wait before setting key2 to ensure different expiration times
      await new Promise((resolve) => setTimeout(resolve, 50))
      cache.set('key2', 'value2')
      expect(cache.size()).toBe(2)

      // Wait for key1 to expire (set at t=0, expires at t=80; we're at t=50+50=100)
      await new Promise((resolve) => setTimeout(resolve, 50))
      cache.get('key1') // This should remove the expired entry
      expect(cache.size()).toBe(1)
      // key2 was set at t=50, expires at t=130, we're at t=100, so still valid
      expect(cache.get('key2')).toBe('value2')
    })

    test('entries without TTL never expire', () => {
      const cache = new LRUCache<string>()
      cache.set('key1', 'value1')
      expect(cache.get('key1')).toBe('value1')

      // Simulate time passing (but without TTL, it shouldn't expire)
      expect(cache.get('key1')).toBe('value1')
    })

    test('respects different TTLs for different caches', async () => {
      const cache1 = new LRUCache<string>({ ttlMs: 50 })
      const cache2 = new LRUCache<string>({ ttlMs: 200 })

      cache1.set('key1', 'value1')
      cache2.set('key1', 'value1')

      await new Promise((resolve) => setTimeout(resolve, 100))
      expect(cache1.get('key1')).toBeUndefined()
      expect(cache2.get('key1')).toBe('value1')
    })
  })

  describe('clear method', () => {
    test('removes all entries', () => {
      const cache = new LRUCache<string>()
      cache.set('key1', 'value1')
      cache.set('key2', 'value2')
      cache.set('key3', 'value3')
      expect(cache.size()).toBe(3)

      cache.clear()
      expect(cache.size()).toBe(0)
      expect(cache.get('key1')).toBeUndefined()
      expect(cache.get('key2')).toBeUndefined()
    })

    test('allows new entries after clear', () => {
      const cache = new LRUCache<string>()
      cache.set('key1', 'value1')
      cache.clear()
      cache.set('key2', 'value2')
      expect(cache.size()).toBe(1)
      expect(cache.get('key2')).toBe('value2')
    })
  })

  describe('size method', () => {
    test('returns correct cache size', () => {
      const cache = new LRUCache<string>()
      expect(cache.size()).toBe(0)
      cache.set('key1', 'value1')
      expect(cache.size()).toBe(1)
      cache.set('key2', 'value2')
      expect(cache.size()).toBe(2)
      cache.evict('key1')
      expect(cache.size()).toBe(1)
    })
  })

  describe('complex scenarios', () => {
    test('handles cache churn with max size 1', () => {
      const cache = new LRUCache<string>({ maxSize: 1 })
      cache.set('key1', 'value1')
      expect(cache.get('key1')).toBe('value1')
      cache.set('key2', 'value2')
      expect(cache.get('key1')).toBeUndefined()
      expect(cache.get('key2')).toBe('value2')
      cache.set('key3', 'value3')
      expect(cache.get('key2')).toBeUndefined()
      expect(cache.get('key3')).toBe('value3')
    })

    test('handles mixed operations', () => {
      const cache = new LRUCache<number>({ maxSize: 3 })
      cache.set('a', 1)
      cache.set('b', 2)
      cache.set('c', 3)
      expect(cache.get('a')).toBe(1)  // a is now most recent
      cache.set('d', 4)  // evicts b (least recently used)
      expect(cache.get('b')).toBeUndefined()
      cache.evict('c')  // remove c explicitly, cache has {a, d}
      expect(cache.size()).toBe(2)
      cache.set('e', 5)  // cache has {a, d, e}
      cache.set('f', 6)  // evicts a (least recently used), cache has {d, e, f}
      expect(cache.get('a')).toBeUndefined()  // a was evicted
      expect(cache.get('d')).toBe(4)
      expect(cache.get('e')).toBe(5)
      expect(cache.get('f')).toBe(6)
    })
  })
})
