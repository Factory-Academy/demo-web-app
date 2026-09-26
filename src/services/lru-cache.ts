/**
 * Represents a cache entry with a stored value and expiration timestamp.
 * @template T - The type of the cached value
 */
type CacheEntry<T> = {
  value: T
  expiresAt: number
}

/**
 * Configuration options for LRU cache initialization.
 */
type LruCacheOptions = {
  /** Maximum number of items to store in the cache */
  maxSize: number
  /** Time-to-live for cached entries in milliseconds */
  ttlMs: number
}

/**
 * Least Recently Used (LRU) cache with time-to-live (TTL) expiration.
 * 
 * Implements an LRU eviction policy combined with TTL-based expiration.
 * When the cache reaches max capacity, the least recently accessed item is evicted.
 * Items automatically expire after the specified TTL regardless of access patterns.
 * 
 * @template K - The type of cache keys
 * @template V - The type of cached values
 * 
 * @example
 * ```typescript
 * const cache = new LruCache<string, number>({ maxSize: 100, ttlMs: 60000 });
 * cache.set('counter', 42);
 * const value = cache.get('counter'); // 42
 * cache.evict('counter');
 * const expired = cache.get('counter'); // undefined
 * ```
 */
export class LruCache<K, V> {
  private readonly maxSize: number
  private readonly ttlMs: number
  private readonly cache = new Map<K, CacheEntry<V>>()

  /**
   * Creates a new LRU cache instance.
   * 
   * @param options - Cache configuration options
   * @param options.maxSize - Maximum number of items to store (must be > 0)
   * @param options.ttlMs - Time-to-live for entries in milliseconds (must be > 0)
   * @throws Error if maxSize or ttlMs is not greater than 0
   */
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

  /**
   * Retrieves a value from the cache if it exists and has not expired.
   * 
   * Accessing an item marks it as recently used, affecting LRU eviction order.
   * Expired entries are automatically deleted on retrieval.
   * 
   * @param key - The cache key to look up
   * @returns The cached value, or undefined if the key does not exist or is expired
   */
  get(key: K): V | undefined {
    const entry = this.cache.get(key)
    if (!entry) {
      return undefined
    }

    if (entry.expiresAt <= Date.now()) {
      this.cache.delete(key)
      return undefined
    }

    this.cache.delete(key)
    this.cache.set(key, entry)
    return entry.value
  }

  /**
   * Stores or updates a value in the cache.
   * 
   * Updates the expiration timestamp for existing keys and moves the entry
   * to the end of the LRU queue. If the cache exceeds max capacity, the least
   * recently used item is automatically evicted.
   * 
   * @param key - The cache key
   * @param value - The value to cache
   */
  set(key: K, value: V): void {
    const entry: CacheEntry<V> = {
      value,
      expiresAt: Date.now() + this.ttlMs,
    }

    if (this.cache.has(key)) {
      this.cache.delete(key)
    }

    this.cache.set(key, entry)

    if (this.cache.size > this.maxSize) {
      const oldestKey = this.cache.keys().next().value as K | undefined
      if (oldestKey !== undefined) {
        this.cache.delete(oldestKey)
      }
    }
  }

  /**
   * Removes an entry from the cache.
   * 
   * @param key - The cache key to remove
   * @returns true if the key was found and removed, false otherwise
   */
  evict(key: K): boolean {
    return this.cache.delete(key)
  }
}
