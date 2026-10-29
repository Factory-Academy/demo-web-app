import { NextResponse } from 'next/server'
import { Item } from '@/models/item'
import { ItemService } from '@/services/item-service'
import { parsePaginationParams } from '@/utils/pagination'

const items: Item[] = []
let nextId = 1
const itemService = new ItemService()

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const paginationOptions = parsePaginationParams(searchParams)
  
  const result = itemService.listItems(items, paginationOptions)
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
