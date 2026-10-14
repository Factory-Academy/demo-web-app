import { NextResponse } from 'next/server'
import { Item, ItemCreate } from '@/models/item'
import { validate, stringRequired, stringOptional, stringEnum } from '@/utils/validators'

const items: Item[] = []
let nextId = 1

// Validation schema for item creation
const itemCreateSchema = {
  name: stringRequired('name'),
  description: stringOptional(),
  status: stringEnum('status', ['active', 'pending', 'completed']),
}

export async function GET() {
  return NextResponse.json(items)
}

export async function POST(request: Request) {
  try {
    const data = await request.json() as Record<string, unknown>

    // Validate input
    const validation = validate(data, itemCreateSchema)
    if (!validation.valid) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.errors },
        { status: 400 },
      )
    }

    // Ensure status has a default value if not provided
    const status = (data.status as string) || 'active'

    const item: Item = {
      name: data.name as string,
      description: (data.description as string) || undefined,
      status,
      id: String(nextId++),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    items.push(item)
    return NextResponse.json(item, { status: 201 })
  } catch (err) {
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 },
    )
  }
}
