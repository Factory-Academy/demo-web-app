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

  test('evicts correctly when key is a falsy value', () => {
    const cache = new LruCache<number, string>({ maxSize: 2, ttlMs: 1000 })
    cache.set(0, 'value-zero')
    cache.set(1, 'value-one')

    cache.get(0)
    cache.set(2, 'value-two')

    expect(cache.get(0)).toBe('value-zero')
    expect(cache.get(1)).toBeUndefined()
    expect(cache.get(2)).toBe('value-two')
  })
})
