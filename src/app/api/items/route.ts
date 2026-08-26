import { NextResponse } from 'next/server'
import { Item } from '@/models/item'
import {
  KeyedRateLimiter,
  clientKeyFromHeaders,
  rateLimitHeaders,
} from '@/lib/rate-limiter'

const items: Item[] = []
let nextId = 1

// Per-client write budget: 5 requests up front, refilling 1 token/second.
const writeLimiter = new KeyedRateLimiter({
  capacity: 5,
  refillTokens: 1,
  refillIntervalMs: 1000,
  maxIdleMs: 10 * 60 * 1000,
  maxKeys: 10_000,
})

export async function GET() {
  return NextResponse.json(items)
}

export async function POST(request: Request) {
  const key = clientKeyFromHeaders(request.headers)
  const limit = writeLimiter.check(key)

  if (!limit.allowed) {
    return NextResponse.json(
      { error: 'Too many requests' },
      { status: 429, headers: rateLimitHeaders(limit) },
    )
  }

  const data = await request.json()
  const item: Item = {
    ...data,
    id: String(nextId++),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
  items.push(item)
  return NextResponse.json(item, { status: 201, headers: rateLimitHeaders(limit) })
}
