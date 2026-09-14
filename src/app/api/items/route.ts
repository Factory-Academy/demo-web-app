import { NextResponse } from 'next/server'
import { Item } from '@/models/item'
import { ValidatorService } from '@/services/validator-service'

const items: Item[] = []
let nextId = 1
const validatorService = new ValidatorService()

export async function GET() {
  return NextResponse.json(items)
}

export async function POST(request: Request) {
  const data = await request.json()
  
  // Validate input using schema-lite validators
  const validation = validatorService.validateItemCreate(data)
  if (!validation.valid) {
    return NextResponse.json(
      { 
        error: 'Validation failed',
        details: validation.errors 
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
