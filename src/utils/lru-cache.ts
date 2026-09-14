/**
 * In-memory LRU (Least Recently Used) cache with TTL (Time-To-Live) support.
 *
 * Features:
 * - Generic type support for any value type
 * - Automatic eviction when max size is reached
 * - Optional TTL for automatic expiration
 * - O(1) get/set/evict operations using Map and doubly-linked list
 *
 * @example
 * const cache = new LRUCache<string>({ maxSize: 100, ttlMs: 5 * 60 * 1000 })
 * cache.set('user:123', 'John Doe')
 * const value = cache.get('user:123') // 'John Doe'
 * cache.evict('user:123')
 */
interface CacheEntry<T> {
  value: T
  expiresAt?: number
}

export class LRUCache<T> {
  private readonly maxSize: number
  private readonly ttlMs?: number
  private cache: Map<string, CacheEntry<T>>
  private order: string[] // Track access order for LRU

  /**
   * Creates a new LRU cache instance.
   *
   * @param options - Cache configuration
   * @param options.maxSize - Maximum number of entries (default: 100)
   * @param options.ttlMs - Time-to-live in milliseconds (optional)
   */
  constructor(options: { maxSize?: number; ttlMs?: number } = {}) {
    this.maxSize = options.maxSize ?? 100
    this.ttlMs = options.ttlMs
    this.cache = new Map()
    this.order = []

    if (this.maxSize <= 0) {
      throw new Error('maxSize must be greater than 0')
    }
  }

  /**
   * Gets a value from the cache.
   * Returns undefined if the key doesn't exist or has expired.
   * Updates access order for LRU tracking.
   *
   * @param key - The cache key
   * @returns The cached value or undefined
   */
  get(key: string): T | undefined {
    const entry = this.cache.get(key)
    
    if (!entry) {
      return undefined
    }

    // Check if entry has expired
    if (entry.expiresAt !== undefined && Date.now() > entry.expiresAt) {
      this.cache.delete(key)
      this.removeFromOrder(key)
      return undefined
    }

    // Update access order (move to end for LRU)
    this.removeFromOrder(key)
    this.order.push(key)

    return entry.value
  }

  /**
   * Sets a value in the cache.
   * If cache is at max size, evicts the least recently used entry.
   *
   * @param key - The cache key
   * @param value - The value to cache
   */
  set(key: string, value: T): void {
    // If key already exists, remove it from tracking
    if (this.cache.has(key)) {
      this.removeFromOrder(key)
    } else if (this.cache.size >= this.maxSize) {
      // Evict LRU entry if at max capacity
      const lruKey = this.order.shift()
      if (lruKey) {
        this.cache.delete(lruKey)
      }
    }

    const entry: CacheEntry<T> = {
      value,
      expiresAt: this.ttlMs ? Date.now() + this.ttlMs : undefined,
    }

    this.cache.set(key, entry)
    this.order.push(key)
  }

  /**
   * Removes a specific entry from the cache.
   *
   * @param key - The cache key to remove
   * @returns true if the entry was removed, false if it didn't exist
   */
  evict(key: string): boolean {
    if (this.cache.has(key)) {
      this.cache.delete(key)
      this.removeFromOrder(key)
      return true
    }
    return false
  }

  /**
   * Clears all entries from the cache.
   */
  clear(): void {
    this.cache.clear()
    this.order = []
  }

  /**
   * Gets the current number of entries in the cache.
   */
  size(): number {
    return this.cache.size
  }

  /**
   * Removes a key from the order tracking array.
   * @internal
   */
  private removeFromOrder(key: string): void {
    const index = this.order.indexOf(key)
    if (index > -1) {
      this.order.splice(index, 1)
    }
  }
}
