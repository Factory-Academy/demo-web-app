import { NextResponse } from 'next/server'
import { Item, ITEM_STATES } from '@/models/item'
import { schema, field, validators, validate } from '@/utils/schema-validators'
import {
  ItemWorkflow,
  ItemStore,
  ITEM_EVENTS,
  WorkflowErrorReason,
} from '@/services/item-workflow'

const items: Item[] = []
let nextId = 1

// In-memory store adapter backing the lifecycle workflow.
const store: ItemStore = {
  get: (id) => items.find((item) => item.id === id),
  save: (updated) => {
    const index = items.findIndex((item) => item.id === updated.id)
    if (index >= 0) items[index] = updated
  },
}

const workflow = new ItemWorkflow(store)

/**
 * Map a workflow failure onto an HTTP status.
 *
 * - a missing item is `404 Not Found`;
 * - an undefined event is a malformed request, `400 Bad Request` (the schema
 *   normally rejects these first, so this is a defensive fallback);
 * - a store failure is transient, `503 Service Unavailable`;
 * - a disallowed, guard-blocked, or corrupt-state transition conflicts with
 *   the item's current persisted state, `409 Conflict`.
 */
export function statusForReason(reason?: WorkflowErrorReason): number {
  switch (reason) {
    case 'not-found':
      return 404
    case 'unknown-event':
      return 400
    case 'store-error':
      return 503
    default:
      return 409
  }
}

// Define validation schema for item creation
const itemCreateSchema = schema({
  name: field([validators.required(), validators.string(), validators.minLength(1)]),
  description: field([validators.string(), validators.maxLength(500)], { optional: true }),
  status: field(
    [validators.required(), validators.string(), validators.enum(ITEM_STATES)],
    { optional: true }
  ),
})

// Validation schema for lifecycle transition requests
const itemTransitionSchema = schema({
  id: field([validators.required(), validators.string()]),
  event: field([validators.required(), validators.string(), validators.enum(ITEM_EVENTS)]),
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

/**
 * Advance an item through its lifecycle. The body carries the item `id` and
 * the lifecycle `event` to apply; the workflow enforces which transitions
 * are legal from the item's current state.
 */
export async function PATCH(request: Request) {
  const data = await request.json()

  const validationResult = validate(data, itemTransitionSchema)
  if (!validationResult.valid) {
    return NextResponse.json(
      {
        error: 'Validation failed',
        details: validationResult.errors,
      },
      { status: 400 }
    )
  }

  const result = await workflow.send(data.id, data.event)
  if (!result.ok) {
    return NextResponse.json(
      { error: result.error },
      { status: statusForReason(result.reason) }
    )
  }

  return NextResponse.json(result.item)
}
