import { NextResponse } from 'next/server'
import { Item } from '@/models/item'
import { ItemService } from '@/services/item-service'

const items: Item[] = []
let nextId = 1

const service = new ItemService()

export async function GET() {
  return NextResponse.json(items)
}

export async function POST(request: Request) {
  const data = await request.json()

  const validation = service.validate(data)
  if (!validation.valid) {
    return NextResponse.json({ errors: validation.errors }, { status: 400 })
  }

  const item: Item = {
    ...data,
    id: String(nextId++),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
  items.push(item)

  const priority = service.registerCreated(item)
  return NextResponse.json({ ...item, priority }, { status: 201 })
}
