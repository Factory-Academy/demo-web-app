export interface TokenBucketOptions {
  capacity: number
  refillTokens: number
  refillIntervalMs: number
  initialTokens?: number
  now?: () => number
}

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  limit: number
  requested: number
  retryAfterMs: number
  resetMs: number
}

export interface RateLimiter {
  tryConsume(tokens?: number): RateLimitResult
  peek(): number
  reset(): void
}

export interface KeyedRateLimiterOptions extends TokenBucketOptions {
  maxIdleMs?: number
  maxKeys?: number
}
