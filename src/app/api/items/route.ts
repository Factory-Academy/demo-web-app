import { NextResponse } from 'next/server'
import { Item } from '@/models/item'
import { ItemService } from '@/services/item-service'
import { ValidationError, toErrorResponse } from '@/utils/api-errors'

const items: Item[] = []
let nextId = 1
const itemService = new ItemService()

function parseLimit(limitParam: string | null): number | undefined {
  if (limitParam === null) {
    return undefined
  }

  if (!/^\d+$/.test(limitParam)) {
    throw new ValidationError('Validation failed', ['Limit must be a whole number'])
  }

  return parseInt(limitParam, 10)
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const cursor = searchParams.get('cursor') || undefined
    const limit = parseLimit(searchParams.get('limit'))

    const result = itemService.listItems(items, { cursor, limit })
    return NextResponse.json(result)
  } catch (error) {
    return toErrorResponse(error)
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json()
    itemService.validateOrThrow(data)

    const item: Item = {
      ...data,
      id: String(nextId++),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    items.push(item)
    return NextResponse.json(item, { status: 201 })
  } catch (error) {
    return toErrorResponse(error)
  }
}
