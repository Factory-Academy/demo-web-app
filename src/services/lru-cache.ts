type CacheEntry<T> = {
  value: T
  expiresAt: number
}

type LruCacheOptions = {
  maxSize: number
  ttlMs: number
}

export class LruCache<K, V> {
  private readonly maxSize: number
  private readonly ttlMs: number
  private readonly cache = new Map<K, CacheEntry<V>>()

  constructor(options: LruCacheOptions) {
    if (options.maxSize <= 0) {
      throw new Error('maxSize must be greater than 0')
    }
    if (options.ttlMs <= 0) {
      throw new Error('ttlMs must be greater than 0')
    }

    this.maxSize = options.maxSize
    this.ttlMs = options.ttlMs
  }

  get(key: K): V | undefined {
    const entry = this.cache.get(key)
    if (!entry) {
      return undefined
    }

    if (entry.expiresAt < Date.now()) {
      this.cache.delete(key)
      return undefined
    }

    // Move to end to mark as recently used
    this.cache.delete(key)
    this.cache.set(key, entry)
    return entry.value
  }

  set(key: K, value: V): void {
    const entry: CacheEntry<V> = {
      value,
      expiresAt: Date.now() + this.ttlMs,
    }

    // Remove existing key if present to update it
    if (this.cache.has(key)) {
      this.cache.delete(key)
    }

    // Evict least recently used before adding if at capacity
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value as K | undefined
      if (oldestKey !== undefined) {
        this.cache.delete(oldestKey)
      }
    }

    this.cache.set(key, entry)
  }

  evict(key: K): boolean {
    return this.cache.delete(key)
  }
}
