import { NextResponse } from 'next/server'
import { Item } from '@/models/item'
import { ItemService } from '@/services/item-service'

const items: Item[] = []
let nextId = 1
const itemService = new ItemService()

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const cursor = searchParams.get('cursor') || undefined
  const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!, 10) : undefined

  const result = itemService.listItems(items, { cursor, limit })
  return NextResponse.json(result)
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
  return NextResponse.json(item, { status: 201 })
}
