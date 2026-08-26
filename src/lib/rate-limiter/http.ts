import { RateLimitResult } from './types'

/**
 * Derives a stable rate-limit key for an incoming request.
 *
 * Prefers the first hop in `x-forwarded-for`, then `x-real-ip`, and finally
 * falls back to a shared bucket so a missing header never bypasses limiting.
 */
export function clientKeyFromHeaders(headers: Headers): string {
  const forwarded = headers.get('x-forwarded-for')
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim()
    if (first) return first
  }

  const realIp = headers.get('x-real-ip')?.trim()
  if (realIp) return realIp

  return 'anonymous'
}

/**
 * Standard rate-limit response headers. `retryAfterMs` and `resetMs` are
 * exposed in whole seconds per the HTTP `Retry-After` convention.
 */
export function rateLimitHeaders(result: RateLimitResult): Record<string, string> {
  const headers: Record<string, string> = {
    'X-RateLimit-Limit': String(result.limit),
    'X-RateLimit-Remaining': String(Math.max(0, result.remaining)),
    'X-RateLimit-Reset': String(msToSeconds(result.resetMs)),
  }

  if (!result.allowed && Number.isFinite(result.retryAfterMs)) {
    headers['Retry-After'] = String(msToSeconds(result.retryAfterMs))
  }

  return headers
}

function msToSeconds(ms: number): number {
  if (!Number.isFinite(ms) || ms <= 0) return 0
  return Math.ceil(ms / 1000)
}
