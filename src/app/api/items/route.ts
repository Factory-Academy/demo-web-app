import { NextResponse } from 'next/server'
import { Item } from '@/models/item'
import { ItemService } from '@/services/item-service'

const items: Item[] = []
let nextId = 1
const itemService = new ItemService()

export async function GET() {
  return NextResponse.json(items)
}

export async function POST(request: Request) {
  try {
    const data = await request.json()

    // Validate input using shared validation
    const validationResult = itemService.validate(data)
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validationResult.errors,
        },
        { status: 400 }
      )
    }

    // Create item with validated data
    const item: Item = {
      ...data,
      id: String(nextId++),
      status: data.status || 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    items.push(item)
    return NextResponse.json(item, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Invalid request',
        details: [{ message: 'Failed to parse request body', code: 'INVALID_JSON' }],
      },
      { status: 400 }
    )
  }
}
