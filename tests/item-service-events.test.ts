import { ItemService } from '../src/services/item-service'
import { TypedEventEmitter } from '../src/services/event-emitter'
import { AppEventMap } from '../src/models/event'
import { IFeatureFlagProvider } from '../src/models/feature-flag'
import { Item } from '../src/models/item'

// Minimal flag provider so these tests exercise event emission independently of
// feature-flag configuration.
class StubFlags implements IFeatureFlagProvider {
  isEnabled(): boolean {
    return false
  }
  isEnabledWithDefault(_key: string, defaultValue: boolean): boolean {
    return defaultValue
  }
  getAllFlags(): Record<string, boolean> {
    return {}
  }
}

function makeItem(overrides: Partial<Item> = {}): Item {
  const now = new Date().toISOString()
  return {
    id: '1',
    name: 'Task',
    status: 'active',
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

describe('ItemService event integration', () => {
  test('validate emits item:validated with the outcome', () => {
    const events = new TypedEventEmitter<AppEventMap>()
    const service = new ItemService(new StubFlags(), events)
    const handler = jest.fn()
    events.on('item:validated', handler)

    const result = service.validate({ name: 'Valid', status: 'active' })

    expect(result.valid).toBe(true)
    expect(handler).toHaveBeenCalledTimes(1)
    expect(handler).toHaveBeenCalledWith({
      data: { name: 'Valid', status: 'active' },
      valid: true,
      errors: [],
    })
  })

  test('validate reports failures through the event payload', () => {
    const events = new TypedEventEmitter<AppEventMap>()
    const service = new ItemService(new StubFlags(), events)
    const handler = jest.fn()
    events.on('item:validated', handler)

    service.validate({ name: '' })

    const payload = handler.mock.calls[0][0]
    expect(payload.valid).toBe(false)
    expect(payload.errors).toContain('Name is required')
  })

  test('calculatePriority emits item:priority_calculated with the bucket', () => {
    const events = new TypedEventEmitter<AppEventMap>()
    const service = new ItemService(new StubFlags(), events)
    const handler = jest.fn()
    events.on('item:priority_calculated', handler)

    const item = makeItem({ status: 'active' })
    const priority = service.calculatePriority(item)

    expect(handler).toHaveBeenCalledTimes(1)
    expect(handler).toHaveBeenCalledWith({ item, priority })
  })

  test('a throwing listener does not corrupt the validate result', () => {
    const onError = jest.fn()
    const events = new TypedEventEmitter<AppEventMap>({ onError })
    const service = new ItemService(new StubFlags(), events)
    events.on('item:validated', () => {
      throw new Error('listener failure')
    })

    const result = service.validate({ name: 'Valid', status: 'active' })

    expect(result.valid).toBe(true)
    expect(onError).toHaveBeenCalledTimes(1)
  })

  test('defaults to the shared appEvents bus when none is injected', () => {
    const service = new ItemService(new StubFlags())

    expect(() =>
      service.validate({ name: 'Valid', status: 'active' })
    ).not.toThrow()
  })
})
