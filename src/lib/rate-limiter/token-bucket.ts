import { RateLimiter, RateLimitResult, TokenBucketOptions } from './types'

const defaultClock = () => Date.now()

/**
 * Lazily-refilling token bucket.
 *
 * Tokens accrue continuously at `refillTokens / refillIntervalMs` per
 * millisecond and are capped at `capacity`. Refill is computed on demand
 * from elapsed wall-clock time, so no timers are held open.
 */
export class TokenBucket implements RateLimiter {
  private readonly capacity: number
  private readonly refillTokens: number
  private readonly refillIntervalMs: number
  private readonly ratePerMs: number
  private readonly now: () => number

  private tokens: number
  private lastRefill: number

  constructor(options: TokenBucketOptions) {
    const { capacity, refillTokens, refillIntervalMs, initialTokens, now } = options

    if (!Number.isFinite(capacity) || capacity <= 0) {
      throw new RangeError('capacity must be a positive finite number')
    }
    if (!Number.isFinite(refillTokens) || refillTokens <= 0) {
      throw new RangeError('refillTokens must be a positive finite number')
    }
    if (!Number.isFinite(refillIntervalMs) || refillIntervalMs <= 0) {
      throw new RangeError('refillIntervalMs must be a positive finite number')
    }
    if (initialTokens !== undefined && (!Number.isFinite(initialTokens) || initialTokens < 0)) {
      throw new RangeError('initialTokens must be a non-negative finite number')
    }

    this.capacity = capacity
    this.refillTokens = refillTokens
    this.refillIntervalMs = refillIntervalMs
    this.ratePerMs = refillTokens / refillIntervalMs
    this.now = now ?? defaultClock

    this.tokens = Math.min(initialTokens ?? capacity, capacity)
    this.lastRefill = this.now()
  }

  tryConsume(tokens = 1): RateLimitResult {
    if (!Number.isFinite(tokens) || tokens <= 0) {
      throw new RangeError('tokens must be a positive finite number')
    }

    this.refill()

    // A request larger than the bucket can never be satisfied. Report it as
    // rejected with an unbounded wait rather than looping forever.
    if (tokens > this.capacity) {
      return this.result(false, tokens, Infinity)
    }

    if (this.tokens >= tokens) {
      this.tokens -= tokens
      return this.result(true, tokens, 0)
    }

    const deficit = tokens - this.tokens
    const retryAfterMs = Math.ceil(deficit / this.ratePerMs)
    return this.result(false, tokens, retryAfterMs)
  }

  peek(): number {
    this.refill()
    return this.tokens
  }

  reset(): void {
    this.tokens = this.capacity
    this.lastRefill = this.now()
  }

  private refill(): void {
    const current = this.now()
    const elapsed = current - this.lastRefill

    // Guard against a non-monotonic clock (e.g. NTP adjustment). Never grant
    // tokens for non-positive elapsed time; rebase to the new time so forward
    // progress resumes from here.
    if (elapsed <= 0) {
      this.lastRefill = current
      return
    }

    const refilled = elapsed * this.ratePerMs
    if (refilled <= 0) return

    this.tokens = Math.min(this.capacity, this.tokens + refilled)
    this.lastRefill = current
  }

  private result(allowed: boolean, requested: number, retryAfterMs: number): RateLimitResult {
    const missingToFull = this.capacity - this.tokens
    const resetMs = missingToFull <= 0 ? 0 : Math.ceil(missingToFull / this.ratePerMs)
    return {
      allowed,
      remaining: Math.floor(this.tokens),
      limit: this.capacity,
      requested,
      retryAfterMs,
      resetMs,
    }
  }
}
