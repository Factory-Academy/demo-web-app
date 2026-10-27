/**
 * A generic in-memory LRU cache with optional TTL (time-to-live) support.
 * Evicts the least-recently-used item when max size is reached.
 */
export class LruCache<K, V> {
  private map: Map<K, { value: V; expiresAt?: number }>
  private accessOrder: K[] // Tracks order of access for LRU eviction

  constructor(private maxSize: number = 100, private ttlMs?: number) {
    if (maxSize < 1) {
      throw new Error('maxSize must be at least 1')
    }
    this.map = new Map()
    this.accessOrder = []
  }

  /**
   * Get a value from the cache. Returns undefined if key is not found or expired.
   * Marks the key as recently accessed (moves to end of access order).
   */
  get(key: K): V | undefined {
    const entry = this.map.get(key)
    if (!entry) return undefined

    // Check if expired
    if (entry.expiresAt !== undefined && Date.now() > entry.expiresAt) {
      this.map.delete(key)
      this.removeFromAccessOrder(key)
      return undefined
    }

    // Mark as recently accessed
    this.removeFromAccessOrder(key)
    this.accessOrder.push(key)

    return entry.value
  }

  /**
   * Set a value in the cache. If the key already exists, it updates the value.
   * If adding a new key would exceed maxSize, the LRU item is evicted.
   */
  set(key: K, value: V): void {
    // If key already exists, remove it first
    if (this.map.has(key)) {
      this.removeFromAccessOrder(key)
    }

    // If we're at capacity, evict the LRU item
    if (this.accessOrder.length >= this.maxSize && !this.map.has(key)) {
      const lruKey = this.accessOrder.shift()
      if (lruKey !== undefined) {
        this.map.delete(lruKey)
      }
    }

    // Add the new entry
    const expiresAt = this.ttlMs !== undefined ? Date.now() + this.ttlMs : undefined
    this.map.set(key, { value, expiresAt })
    this.accessOrder.push(key)
  }

  /**
   * Explicitly remove a key from the cache.
   */
  evict(key: K): boolean {
    const removed = this.map.delete(key)
    if (removed) {
      this.removeFromAccessOrder(key)
    }
    return removed
  }

  /**
   * Clear all entries from the cache.
   */
  clear(): void {
    this.map.clear()
    this.accessOrder = []
  }

  /**
   * Get the current number of entries in the cache.
   */
  size(): number {
    return this.map.size
  }

  private removeFromAccessOrder(key: K): void {
    const index = this.accessOrder.indexOf(key)
    if (index !== -1) {
      this.accessOrder.splice(index, 1)
    }
  }
}
