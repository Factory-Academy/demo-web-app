import { NextResponse } from 'next/server'
import { createLogger } from '@/lib/logger'
import { Item } from '@/models/item'

const items: Item[] = []
let nextId = 1
const logger = createLogger({
  service: 'demo-web-app',
  component: 'items-api',
})

export async function GET() {
  logger.info('Items listed', {
    event: 'items.listed',
    itemCount: items.length,
  })

  return NextResponse.json(items)
}

export async function POST(request: Request) {
  try {
    const data = await request.json()
    const item: Item = {
      ...data,
      id: String(nextId++),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    items.push(item)

    logger.info('Item created', {
      event: 'item.created',
      itemId: item.id,
      status: item.status,
    })

    return NextResponse.json(item, { status: 201 })
  } catch (error) {
    logger.error('Item creation failed', error, {
      event: 'item.create_failed',
    })
    throw error
  }
}
