import { NextResponse } from 'next/server'
import { Item } from '@/models/item'
import { LruCache } from '@/services/lru-cache'

const items: Item[] = []
let nextId = 1
const itemsCacheKey = 'items:all'
const itemsCache = new LruCache<string, Item[]>({
  maxSize: 100,
  ttlMs: 30_000,
})

export async function GET() {
  const cachedItems = itemsCache.get(itemsCacheKey)
  if (cachedItems) {
    return NextResponse.json(cachedItems)
  }

  const snapshot = [...items]
  itemsCache.set(itemsCacheKey, snapshot)
  return NextResponse.json(snapshot)
}

export async function POST(request: Request) {
  const data = await request.json()
  const item: Item = {
    ...data,
    id: String(nextId++),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
  items.push(item)
  itemsCache.evict(itemsCacheKey)
  return NextResponse.json(item, { status: 201 })
}

export function __resetItemsForTests() {
  items.length = 0
  nextId = 1
  itemsCache.evict(itemsCacheKey)
}
