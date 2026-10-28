import { NextResponse } from 'next/server'
import { Item } from '@/models/item'
import { validateItemCreate } from '@/validation/item-create-schema'

const items: Item[] = []
let nextId = 1

export async function GET() {
  return NextResponse.json(items)
}

export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ errors: ['body must be valid JSON'] }, { status: 400 })
  }

  const validation = validateItemCreate(body)
  if (!validation.success) {
    return NextResponse.json({ errors: validation.errors }, { status: 400 })
  }

  const now = new Date().toISOString()
  const item: Item = {
    name: validation.data.name,
    description: validation.data.description,
    status: validation.data.status ?? 'pending',
    id: String(nextId++),
    createdAt: now,
    updatedAt: now,
  }
  items.push(item)
  return NextResponse.json(item, { status: 201 })
}
