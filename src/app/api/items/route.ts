import { NextResponse } from 'next/server'
import { itemQueueService } from '@/services/item-queue-service'

export async function GET() {
  const items = await itemQueueService.getAll()
  return NextResponse.json(items)
}

export async function POST(request: Request) {
  const data = await request.json()
  const item = await itemQueueService.create(data)
  return NextResponse.json(item, { status: 201 })
}
