import { NextResponse } from 'next/server'
import { Item } from '@/models/item'
import { validate, compose, required, isString, minLength, maxLength, oneOf } from '@/lib/validators'

const items: Item[] = []
let nextId = 1

// Define validation schema for item creation
const itemCreateSchema = {
  name: {
    required: true,
    validator: compose(isString, minLength(1), maxLength(200)),
  },
  description: {
    required: false,
    validator: compose(isString, maxLength(1000)),
  },
  status: {
    required: false,
    validator: oneOf(['active', 'pending', 'completed']),
  },
}

export async function GET() {
  return NextResponse.json(items)
}

export async function POST(request: Request) {
  const data = await request.json()

  // Validate input data
  const validation = validate(data, itemCreateSchema)
  if (!validation.valid) {
    return NextResponse.json(
      { errors: validation.errors },
      { status: 400 }
    )
  }

  const item: Item = {
    ...data,
    id: String(nextId++),
    status: data.status || 'pending',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
  items.push(item)
  return NextResponse.json(item, { status: 201 })
}
