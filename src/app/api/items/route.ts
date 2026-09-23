import { NextResponse } from 'next/server'
import { Item } from '@/models/item'
import { ItemService } from '@/services/item-service'

const items: Item[] = []
const itemService = new ItemService()

export async function GET() {
  return NextResponse.json(items)
}

export async function POST(request: Request) {
  try {
    const data = await request.json()
    const result = itemService.create(data)

    if (!result.success) {
      return NextResponse.json({ errors: result.errors }, { status: 400 })
    }

    items.push(result.data)
    return NextResponse.json(result.data, { status: 201 })
  } catch (error) {
    return NextResponse.json({ errors: ['Invalid JSON payload'] }, { status: 400 })
  }
}
