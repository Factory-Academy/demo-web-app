import { clientKeyFromHeaders, rateLimitHeaders } from '../../src/lib/rate-limiter/http'
import { RateLimitResult } from '../../src/lib/rate-limiter/types'

function makeResult(overrides: Partial<RateLimitResult> = {}): RateLimitResult {
  return {
    allowed: true,
    remaining: 4,
    limit: 5,
    requested: 1,
    retryAfterMs: 0,
    resetMs: 1000,
    ...overrides,
  }
}

describe('clientKeyFromHeaders', () => {
  test('uses the first x-forwarded-for hop', () => {
    const headers = new Headers({ 'x-forwarded-for': '203.0.113.5, 70.41.3.18' })
    expect(clientKeyFromHeaders(headers)).toBe('203.0.113.5')
  })

  test('falls back to x-real-ip', () => {
    const headers = new Headers({ 'x-real-ip': '198.51.100.7' })
    expect(clientKeyFromHeaders(headers)).toBe('198.51.100.7')
  })

  test('prefers x-forwarded-for over x-real-ip', () => {
    const headers = new Headers({
      'x-forwarded-for': '203.0.113.5',
      'x-real-ip': '198.51.100.7',
    })
    expect(clientKeyFromHeaders(headers)).toBe('203.0.113.5')
  })

  test('falls back to anonymous when no client headers present', () => {
    expect(clientKeyFromHeaders(new Headers())).toBe('anonymous')
  })

  test('ignores an empty x-forwarded-for value', () => {
    const headers = new Headers({ 'x-forwarded-for': '   ', 'x-real-ip': '198.51.100.7' })
    expect(clientKeyFromHeaders(headers)).toBe('198.51.100.7')
  })
})

describe('rateLimitHeaders', () => {
  test('exposes limit, remaining, and reset', () => {
    const headers = rateLimitHeaders(makeResult({ resetMs: 2500 }))
    expect(headers['X-RateLimit-Limit']).toBe('5')
    expect(headers['X-RateLimit-Remaining']).toBe('4')
    expect(headers['X-RateLimit-Reset']).toBe('3')
  })

  test('clamps negative remaining to zero', () => {
    const headers = rateLimitHeaders(makeResult({ remaining: -3 }))
    expect(headers['X-RateLimit-Remaining']).toBe('0')
  })

  test('adds Retry-After when blocked with finite wait', () => {
    const headers = rateLimitHeaders(makeResult({ allowed: false, retryAfterMs: 1500 }))
    expect(headers['Retry-After']).toBe('2')
  })

  test('omits Retry-After when request is allowed', () => {
    const headers = rateLimitHeaders(makeResult({ allowed: true }))
    expect(headers['Retry-After']).toBeUndefined()
  })

  test('omits Retry-After when wait is infinite', () => {
    const headers = rateLimitHeaders(makeResult({ allowed: false, retryAfterMs: Infinity }))
    expect(headers['Retry-After']).toBeUndefined()
  })
})
