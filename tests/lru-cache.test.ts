import { LruCache } from '../src/services/lru-cache'

describe('LruCache', () => {
  test('returns value for cached key', () => {
    const cache = new LruCache<string, string>({ maxSize: 2, ttlMs: 1000 })
    cache.set('a', 'value-a')

    expect(cache.get('a')).toBe('value-a')
  })

  test('evicts least recently used item when max size is reached', () => {
    const cache = new LruCache<string, string>({ maxSize: 2, ttlMs: 1000 })
    cache.set('a', 'value-a')
    cache.set('b', 'value-b')

    cache.get('a')
    cache.set('c', 'value-c')

    expect(cache.get('a')).toBe('value-a')
    expect(cache.get('b')).toBeUndefined()
    expect(cache.get('c')).toBe('value-c')
  })

  test('expires entries after TTL', async () => {
    const cache = new LruCache<string, string>({ maxSize: 2, ttlMs: 20 })
    cache.set('a', 'value-a')

    await new Promise((resolve) => setTimeout(resolve, 30))

    expect(cache.get('a')).toBeUndefined()
  })

  test('evict removes a key explicitly', () => {
    const cache = new LruCache<string, string>({ maxSize: 2, ttlMs: 1000 })
    cache.set('a', 'value-a')

    expect(cache.evict('a')).toBe(true)
    expect(cache.get('a')).toBeUndefined()
  })

  test('evict returns false for non-existent key', () => {
    const cache = new LruCache<string, string>({ maxSize: 2, ttlMs: 1000 })

    expect(cache.evict('non-existent')).toBe(false)
  })

  test('updating existing key refreshes TTL', async () => {
    const cache = new LruCache<string, string>({ maxSize: 2, ttlMs: 30 })
    cache.set('a', 'value-a')

    await new Promise((resolve) => setTimeout(resolve, 20))
    cache.set('a', 'value-a-updated')

    await new Promise((resolve) => setTimeout(resolve, 20))

    expect(cache.get('a')).toBe('value-a-updated')
  })

  test('maxSize of 1 evicts previous item on new set', () => {
    const cache = new LruCache<string, string>({ maxSize: 1, ttlMs: 1000 })
    cache.set('a', 'value-a')
    cache.set('b', 'value-b')

    expect(cache.get('a')).toBeUndefined()
    expect(cache.get('b')).toBe('value-b')
  })

  test('maxSize of 1 with update does not evict', () => {
    const cache = new LruCache<string, string>({ maxSize: 1, ttlMs: 1000 })
    cache.set('a', 'value-a')
    cache.set('a', 'value-a-updated')

    expect(cache.get('a')).toBe('value-a-updated')
  })

  test('cache does not exceed maxSize after set operations', () => {
    const cache = new LruCache<string, string>({ maxSize: 3, ttlMs: 1000 })
    cache.set('a', 'value-a')
    cache.set('b', 'value-b')
    cache.set('c', 'value-c')
    cache.set('d', 'value-d')

    // Verify cache has exactly 3 items
    const results = [
      cache.get('a'),
      cache.get('b'),
      cache.get('c'),
      cache.get('d'),
    ]

    // Exactly one should be undefined (the evicted one)
    expect(results.filter((r) => r === undefined)).toHaveLength(1)
    expect(results.filter((r) => r !== undefined)).toHaveLength(3)
  })

  test('evict and then set maintains cache integrity', () => {
    const cache = new LruCache<string, string>({ maxSize: 2, ttlMs: 1000 })
    cache.set('a', 'value-a')
    cache.set('b', 'value-b')

    cache.evict('a')
    cache.set('c', 'value-c')

    expect(cache.get('a')).toBeUndefined()
    expect(cache.get('b')).toBe('value-b')
    expect(cache.get('c')).toBe('value-c')
  })

  test('TTL boundary: entry expires after TTL duration', async () => {
    const cache = new LruCache<string, string>({ maxSize: 2, ttlMs: 25 })
    cache.set('a', 'value-a')

    // Wait slightly longer than TTL to account for timing variance
    await new Promise((resolve) => setTimeout(resolve, 35))

    expect(cache.get('a')).toBeUndefined()
  })
})
