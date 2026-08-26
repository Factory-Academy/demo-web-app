import { KeyedRateLimiterOptions, RateLimitResult, TokenBucketOptions } from './types'
import { TokenBucket } from './token-bucket'

interface Entry {
  bucket: TokenBucket
  lastSeen: number
}

/**
 * Manages one {@link TokenBucket} per key (client id, IP, API token, ...).
 *
 * Buckets are created on first use. Idle buckets are evicted after
 * `maxIdleMs` and, if `maxKeys` is set, the least-recently-used bucket is
 * dropped once the map is full. This keeps memory bounded for unbounded key
 * spaces without a background timer.
 */
export class KeyedRateLimiter {
  private readonly options: TokenBucketOptions
  private readonly maxIdleMs: number
  private readonly maxKeys: number
  private readonly now: () => number
  private readonly entries = new Map<string, Entry>()

  constructor(options: KeyedRateLimiterOptions) {
    const { maxIdleMs, maxKeys, ...bucketOptions } = options

    if (maxIdleMs !== undefined && (!Number.isFinite(maxIdleMs) || maxIdleMs <= 0)) {
      throw new RangeError('maxIdleMs must be a positive finite number')
    }
    if (maxKeys !== undefined && (!Number.isInteger(maxKeys) || maxKeys <= 0)) {
      throw new RangeError('maxKeys must be a positive integer')
    }

    this.options = bucketOptions
    this.maxIdleMs = maxIdleMs ?? Infinity
    this.maxKeys = maxKeys ?? Infinity
    this.now = bucketOptions.now ?? (() => Date.now())
  }

  check(key: string, tokens = 1): RateLimitResult {
    const bucket = this.acquire(key)
    return bucket.tryConsume(tokens)
  }

  peek(key: string): number {
    return this.acquire(key).peek()
  }

  reset(key?: string): void {
    if (key === undefined) {
      this.entries.clear()
      return
    }
    this.entries.delete(key)
  }

  /** Number of buckets currently tracked (after pruning idle ones). */
  size(): number {
    this.prune()
    return this.entries.size
  }

  /** Drop buckets that have been idle longer than `maxIdleMs`. */
  prune(): number {
    if (this.maxIdleMs === Infinity) return 0

    const current = this.now()
    let removed = 0
    for (const [key, entry] of this.entries) {
      if (current - entry.lastSeen >= this.maxIdleMs) {
        this.entries.delete(key)
        removed++
      }
    }
    return removed
  }

  private acquire(key: string): TokenBucket {
    this.prune()

    const existing = this.entries.get(key)
    if (existing) {
      existing.lastSeen = this.now()
      // Refresh LRU ordering by reinserting.
      this.entries.delete(key)
      this.entries.set(key, existing)
      return existing.bucket
    }

    this.evictIfFull()

    const bucket = new TokenBucket(this.options)
    this.entries.set(key, { bucket, lastSeen: this.now() })
    return bucket
  }

  private evictIfFull(): void {
    if (this.entries.size < this.maxKeys) return
    const oldest = this.entries.keys().next()
    if (!oldest.done) this.entries.delete(oldest.value)
  }
}
