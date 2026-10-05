import { Item, ItemStatus } from '../src/models/item'
import {
  ItemWorkflow,
  ItemStore,
  itemStateMachine,
} from '../src/services/item-workflow'

function makeItem(overrides: Partial<Item> = {}): Item {
  return {
    id: '1',
    name: 'Test Item',
    status: 'pending',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

/**
 * Simple in-memory store. `delay` lets a test force `save` to resolve on a
 * later microtask, which is how concurrent requests get a chance to
 * interleave if the workflow did not serialize them.
 */
function makeStore(initial: Item[] = [], delay = false): ItemStore & { items: Map<string, Item> } {
  const map = new Map<string, Item>()
  for (const item of initial) map.set(item.id, item)
  return {
    items: map,
    get: (id) => map.get(id),
    save: async (item) => {
      if (delay) await Promise.resolve()
      map.set(item.id, { ...item })
    },
  }
}

const fixedNow = () => '2026-02-02T00:00:00.000Z'

describe('itemStateMachine', () => {
  test('starts in pending', () => {
    expect(itemStateMachine.initial).toBe('pending')
  })

  test('models the expected lifecycle', () => {
    expect(itemStateMachine.next('pending', 'activate')).toBe('active')
    expect(itemStateMachine.next('active', 'complete')).toBe('completed')
    expect(itemStateMachine.next('pending', 'cancel')).toBe('cancelled')
    expect(itemStateMachine.next('active', 'cancel')).toBe('cancelled')
    expect(itemStateMachine.next('completed', 'reopen')).toBe('pending')
    expect(itemStateMachine.next('cancelled', 'reopen')).toBe('pending')
  })

  test('rejects illegal shortcuts', () => {
    expect(itemStateMachine.can('pending', 'complete')).toBe(false)
    expect(itemStateMachine.can('completed', 'activate')).toBe(false)
    expect(itemStateMachine.can('cancelled', 'complete')).toBe(false)
  })
})

describe('ItemWorkflow', () => {
  describe('send', () => {
    test('applies a valid transition and persists the new state', async () => {
      const store = makeStore([makeItem()])
      const workflow = new ItemWorkflow(store, { now: fixedNow })

      const result = await workflow.send('1', 'activate')

      expect(result.ok).toBe(true)
      expect(result.state).toBe('active')
      expect(result.item?.status).toBe('active')
      expect(result.item?.updatedAt).toBe('2026-02-02T00:00:00.000Z')
      expect(store.items.get('1')?.status).toBe('active')
    })

    test('walks the full lifecycle pending -> active -> completed', async () => {
      const store = makeStore([makeItem()])
      const workflow = new ItemWorkflow(store, { now: fixedNow })

      expect((await workflow.send('1', 'activate')).state).toBe('active')
      expect((await workflow.send('1', 'complete')).state).toBe('completed')
      expect(store.items.get('1')?.status).toBe('completed')
    })

    test('supports cancel and reopen', async () => {
      const store = makeStore([makeItem()])
      const workflow = new ItemWorkflow(store, { now: fixedNow })

      expect((await workflow.send('1', 'cancel')).state).toBe('cancelled')
      expect((await workflow.send('1', 'reopen')).state).toBe('pending')
    })

    test('rejects a disallowed transition and leaves the item untouched', async () => {
      const store = makeStore([makeItem()])
      const saveSpy = jest.spyOn(store, 'save')
      const workflow = new ItemWorkflow(store, { now: fixedNow })

      const result = await workflow.send('1', 'complete')

      expect(result.ok).toBe(false)
      expect(result.error).toContain('not allowed from state "pending"')
      expect(result.item?.status).toBe('pending')
      expect(saveSpy).not.toHaveBeenCalled()
      expect(store.items.get('1')?.status).toBe('pending')
    })

    test('returns a not-found result for a missing item', async () => {
      const store = makeStore()
      const workflow = new ItemWorkflow(store, { now: fixedNow })

      const result = await workflow.send('missing', 'activate')

      expect(result.ok).toBe(false)
      expect(result.item).toBeUndefined()
      expect(result.error).toContain('not found')
    })

    test('does not advance a completed (final) item', async () => {
      const store = makeStore([makeItem({ status: 'completed' })])
      const workflow = new ItemWorkflow(store, { now: fixedNow })

      const activate = await workflow.send('1', 'activate')
      const reopen = await workflow.send('1', 'reopen')

      expect(activate.ok).toBe(false)
      expect(reopen.ok).toBe(true)
      expect(reopen.state).toBe('pending')
    })
  })

  describe('concurrent transitions', () => {
    test('serializes transitions so the second reads fresh state', async () => {
      // `delay: true` makes save resolve asynchronously, so without
      // serialization the second request would read the stale "pending"
      // status and fail. Serialization makes it observe "active".
      const store = makeStore([makeItem()], true)
      const workflow = new ItemWorkflow(store, { now: fixedNow })

      const [activate, complete] = await Promise.all([
        workflow.send('1', 'activate'),
        workflow.send('1', 'complete'),
      ])

      expect(activate.ok).toBe(true)
      expect(activate.state).toBe('active')
      expect(complete.ok).toBe(true)
      expect(complete.state).toBe('completed')
      expect(store.items.get('1')?.status).toBe('completed')
    })

    test('a duplicate concurrent event is rejected rather than double-applied', async () => {
      const store = makeStore([makeItem()], true)
      const workflow = new ItemWorkflow(store, { now: fixedNow })

      const [first, second] = await Promise.all([
        workflow.send('1', 'activate'),
        workflow.send('1', 'activate'),
      ])

      expect(first.ok).toBe(true)
      expect(first.state).toBe('active')
      // The second runs after the first committed; activate is no longer
      // legal from "active", so it is rejected instead of silently retried.
      expect(second.ok).toBe(false)
      expect(store.items.get('1')?.status).toBe('active')
    })

    test('transitions on different ids are independent', async () => {
      const store = makeStore([
        makeItem({ id: '1' }),
        makeItem({ id: '2' }),
      ], true)
      const workflow = new ItemWorkflow(store, { now: fixedNow })

      const [a, b] = await Promise.all([
        workflow.send('1', 'activate'),
        workflow.send('2', 'cancel'),
      ])

      expect(a.state).toBe('active')
      expect(b.state).toBe('cancelled')
    })

    test('a rejected transition does not stall later ones on the same id', async () => {
      const store = makeStore([makeItem()], true)
      const workflow = new ItemWorkflow(store, { now: fixedNow })

      const [bad, good] = await Promise.all([
        workflow.send('1', 'complete'), // illegal from pending
        workflow.send('1', 'activate'), // legal, must still run
      ])

      expect(bad.ok).toBe(false)
      expect(good.ok).toBe(true)
      expect(good.state).toBe('active')
    })
  })

  describe('introspection helpers', () => {
    const workflow = new ItemWorkflow(makeStore())

    test('can mirrors the state machine', () => {
      expect(workflow.can('pending', 'activate')).toBe(true)
      expect(workflow.can('pending', 'complete')).toBe(false)
    })

    test('availableEvents lists legal events for a state', () => {
      const events = workflow.availableEvents('pending' as ItemStatus)
      expect(events).toContain('activate')
      expect(events).toContain('cancel')
      expect(events).not.toContain('complete')
    })
  })
})
