import { NextResponse } from 'next/server'
import { Item } from '@/models/item'
import { normalizeItem } from '@/services/item-transform'
import { validateItem } from '@/services/validation'

const items: Item[] = []
let nextId = 1

export async function GET() {
  return NextResponse.json(items)
}

export async function POST(request: Request) {
  // Treat the body as untrusted: parsing can throw, and the payload may be
  // empty, malformed, or oversized. Normalize first, then validate.
  let raw: unknown
  try {
    raw = await request.json()
  } catch {
    return NextResponse.json({ errors: ['Invalid JSON body'] }, { status: 400 })
  }

  const normalized = normalizeItem(raw)
  const validation = validateItem(normalized)
  if (!validation.valid) {
    return NextResponse.json({ errors: validation.errors }, { status: 400 })
  }

  const item: Item = { ...normalized, id: String(nextId++) }
  items.push(item)
  return NextResponse.json(item, { status: 201 })
}
