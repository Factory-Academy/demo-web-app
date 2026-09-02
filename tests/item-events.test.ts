import { EventEmitter } from '../src/lib/event-emitter'
import { ItemEventMap } from '../src/events/item-events'
import { ItemActivityLog } from '../src/events/item-activity-log'
import { ItemService } from '../src/services/item-service'
import { Item } from '../src/models/item'

function makeItem(overrides: Partial<Item> = {}): Item {
  const now = new Date().toISOString()
  return {
    id: '1',
    name: 'Sample',
    status: 'active',
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

describe('ItemService event integration', () => {
  let bus: EventEmitter<ItemEventMap>
  let service: ItemService

  beforeEach(() => {
    bus = new EventEmitter<ItemEventMap>()
    service = new ItemService(bus)
  })

  test('validate emits item:validation_failed with the errors', () => {
    const handler = jest.fn()
    bus.on('item:validation_failed', handler)

    const result = service.validate({ name: '' })

    expect(result.valid).toBe(false)
    expect(handler).toHaveBeenCalledTimes(1)
    expect(handler.mock.calls[0][0].errors).toContain('Name is required')
  })

  test('validate does not emit when the input is valid', () => {
    const handler = jest.fn()
    bus.on('item:validation_failed', handler)

    const result = service.validate({ name: 'Ok', status: 'active' })

    expect(result.valid).toBe(true)
    expect(handler).not.toHaveBeenCalled()
  })

  test('registerCreated emits item:created with the derived priority', () => {
    const handler = jest.fn()
    bus.on('item:created', handler)
    const item = makeItem()

    const priority = service.registerCreated(item)

    expect(handler).toHaveBeenCalledTimes(1)
    expect(handler.mock.calls[0][0]).toEqual({ item, priority })
  })

  test('applyUpdate emits item:updated but not priority change when priority is stable', () => {
    const updated = jest.fn()
    const priorityChanged = jest.fn()
    bus.on('item:updated', updated)
    bus.on('item:priority_changed', priorityChanged)

    const result = service.applyUpdate(makeItem(), { name: 'Renamed' })

    expect(result.name).toBe('Renamed')
    expect(updated).toHaveBeenCalledTimes(1)
    expect(priorityChanged).not.toHaveBeenCalled()
  })

  test('applyUpdate emits item:priority_changed when the computed priority moves', () => {
    // 70 days old scores 35 (medium); flipping to "urgent" adds 50 for a
    // total of 85, which crosses into critical.
    const oldDate = new Date(Date.now() - 70 * 86400000).toISOString()
    const item = makeItem({ status: 'active', createdAt: oldDate })
    const priorityChanged = jest.fn()
    bus.on('item:priority_changed', priorityChanged)

    service.applyUpdate(item, { status: 'urgent' })

    expect(priorityChanged).toHaveBeenCalledTimes(1)
    const payload = priorityChanged.mock.calls[0][0]
    expect(payload.from).toBe('medium')
    expect(payload.to).toBe('critical')
  })

  test('applyUpdate preserves id and refreshes updatedAt', () => {
    const item = makeItem({ id: '7', updatedAt: '2000-01-01T00:00:00.000Z' })
    const result = service.applyUpdate(item, { id: 'hacked', name: 'New' })

    expect(result.id).toBe('7')
    expect(result.updatedAt).not.toBe('2000-01-01T00:00:00.000Z')
  })

  test('defaults to the shared app bus when none is injected', () => {
    const shared = new ItemService()
    expect(() => shared.validate({ name: '' })).not.toThrow()
  })
})

describe('ItemActivityLog', () => {
  test('records every published event via onAny', () => {
    const bus = new EventEmitter<ItemEventMap>()
    const service = new ItemService(bus)
    const log = new ItemActivityLog(bus)

    service.validate({ name: '' })
    service.registerCreated(makeItem())

    expect(log.count()).toBe(2)
    expect(log.count('item:created')).toBe(1)
    expect(log.count('item:validation_failed')).toBe(1)
    expect(log.history().map((e) => e.event)).toEqual([
      'item:validation_failed',
      'item:created',
    ])
  })

  test('history returns a defensive copy', () => {
    const bus = new EventEmitter<ItemEventMap>()
    const log = new ItemActivityLog(bus)
    log.history().push({ event: 'item:created', at: 'x' })
    expect(log.count()).toBe(0)
  })

  test('stops recording after dispose', () => {
    const bus = new EventEmitter<ItemEventMap>()
    const service = new ItemService(bus)
    const log = new ItemActivityLog(bus)

    service.registerCreated(makeItem())
    log.dispose()
    service.registerCreated(makeItem())

    expect(log.count()).toBe(1)
  })
})
