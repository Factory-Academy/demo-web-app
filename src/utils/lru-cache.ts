/**
 * In-memory LRU (Least Recently Used) cache with TTL support.
 * Provides O(1) get, set, and evict operations using a doubly-linked list and hash map.
 */

interface CacheNode<K, V> {
  key: K
  value: V
  expiresAt: number | null
  prev: CacheNode<K, V> | null
  next: CacheNode<K, V> | null
}

export interface LRUCacheOptions {
  maxSize: number
  ttlMs?: number
}

export class LRUCache<K = string, V = any> {
  private readonly maxSize: number
  private readonly ttlMs: number | null
  private cache: Map<K, CacheNode<K, V>>
  private head: CacheNode<K, V> | null
  private tail: CacheNode<K, V> | null

  constructor(options: LRUCacheOptions) {
    if (options.maxSize < 1) {
      throw new Error('maxSize must be at least 1')
    }
    this.maxSize = options.maxSize
    this.ttlMs = options.ttlMs ?? null
    this.cache = new Map()
    this.head = null
    this.tail = null
  }

  /**
   * Retrieves a value from the cache by key.
   * Returns undefined if the key doesn't exist or has expired.
   * Moves the accessed item to the front (most recently used).
   */
  get(key: K): V | undefined {
    const node = this.cache.get(key)
    if (!node) {
      return undefined
    }

    // Check if expired
    if (node.expiresAt !== null && Date.now() > node.expiresAt) {
      this.evict(key)
      return undefined
    }

    // Move to front (most recently used)
    this.moveToFront(node)
    return node.value
  }

  /**
   * Stores a key-value pair in the cache.
   * If the cache is full, evicts the least recently used item.
   * Overwrites existing keys.
   *
   * @example
   * cache.set('user:123', { name: 'Alice' })
   * cache.set('user:456', { name: 'Bob' }, 5000) // Custom TTL: 5 seconds
   */
  set(key: K, value: V, customTtlMs?: number): void {
    const existingNode = this.cache.get(key)

    // Update existing node
    if (existingNode) {
      existingNode.value = value
      existingNode.expiresAt = this.calculateExpiry(customTtlMs)
      this.moveToFront(existingNode)
      return
    }

    // Create new node
    const newNode: CacheNode<K, V> = {
      key,
      value,
      expiresAt: this.calculateExpiry(customTtlMs),
      prev: null,
      next: null,
    }

    // Evict least recently used if at capacity
    if (this.cache.size >= this.maxSize) {
      this.evictLRU()
    }

    // Add to front
    this.cache.set(key, newNode)
    this.addToFront(newNode)
  }

  /**
   * Removes a specific key from the cache.
   * Returns true if the key existed and was removed.
   */
  evict(key: K): boolean {
    const node = this.cache.get(key)
    if (!node) {
      return false
    }

    this.removeNode(node)
    this.cache.delete(key)
    return true
  }

  /**
   * Clears all entries from the cache.
   */
  clear(): void {
    this.cache.clear()
    this.head = null
    this.tail = null
  }

  /**
   * Returns the current number of items in the cache.
   */
  get size(): number {
    return this.cache.size
  }

  /**
   * Returns true if the cache contains the key and it hasn't expired.
   */
  has(key: K): boolean {
    return this.get(key) !== undefined
  }

  private calculateExpiry(customTtlMs?: number): number | null {
    const ttl = customTtlMs ?? this.ttlMs
    return ttl !== null ? Date.now() + ttl : null
  }

  private evictLRU(): void {
    if (this.tail) {
      this.cache.delete(this.tail.key)
      this.removeNode(this.tail)
    }
  }

  private addToFront(node: CacheNode<K, V>): void {
    node.next = this.head
    node.prev = null

    if (this.head) {
      this.head.prev = node
    }

    this.head = node

    if (!this.tail) {
      this.tail = node
    }
  }

  private removeNode(node: CacheNode<K, V>): void {
    if (node.prev) {
      node.prev.next = node.next
    } else {
      this.head = node.next
    }

    if (node.next) {
      node.next.prev = node.prev
    } else {
      this.tail = node.prev
    }
  }

  private moveToFront(node: CacheNode<K, V>): void {
    if (node === this.head) {
      return
    }

    this.removeNode(node)
    this.addToFront(node)
  }
}
