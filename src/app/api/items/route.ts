import { NextResponse } from 'next/server'
import { Item } from '@/models/item'
import { schema, field, validators, validate } from '@/utils/schema-validators'

const items: Item[] = []
let nextId = 1

// Define validation schema for item creation
const itemCreateSchema = schema({
  name: field([validators.required(), validators.string(), validators.minLength(1)]),
  description: field([validators.string(), validators.maxLength(500)], { optional: true }),
  status: field(
    [validators.required(), validators.string(), validators.enum(['active', 'pending', 'completed'])],
    { optional: true }
  ),
})

export async function GET() {
  return NextResponse.json(items)
}

export async function POST(request: Request) {
  const data = await request.json()

  // Validate input data
  const validationResult = validate(data, itemCreateSchema)
  if (!validationResult.valid) {
    return NextResponse.json(
      {
        error: 'Validation failed',
        details: validationResult.errors,
      },
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
