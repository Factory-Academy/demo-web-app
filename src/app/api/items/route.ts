import { NextResponse } from 'next/server'
import { Item } from '@/models/item'
import { validateSchema } from '@/lib/validators/schema'
import { itemCreateSchema } from '@/lib/validators/item-schema'

const items: Item[] = []
let nextId = 1

export async function GET() {
  return NextResponse.json(items)
}

export async function POST(request: Request) {
  const data = await request.json()

  // Validate input against schema
  const validation = validateSchema(data, itemCreateSchema)
  if (!validation.valid) {
    return NextResponse.json(
      {
        error: 'Validation failed',
        details: validation.errors,
      },
      { status: 400 },
    )
  }

  const item: Item = {
    ...data,
    id: String(nextId++),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
  items.push(item)
  return NextResponse.json(item, { status: 201 })
}
