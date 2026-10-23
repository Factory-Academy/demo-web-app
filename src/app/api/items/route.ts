import { NextResponse } from 'next/server'
import { Item } from '@/models/item'
import { ItemService } from '@/services/item-service'
import { ValidationError } from '@/lib/validation-error'

const items: Item[] = []
let nextId = 1
const itemService = new ItemService()

export async function GET() {
  return NextResponse.json(items)
}

export async function POST(request: Request) {
  try {
    const data = await request.json()

    // Validate the input data
    itemService.validate(data)

    const item: Item = {
      ...data,
      id: String(nextId++),
      status: data.status ?? 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    items.push(item)
    return NextResponse.json(item, { status: 201 })
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 },
      )
    }
    throw error
  }
}
