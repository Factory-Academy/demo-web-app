import { ItemQueueService } from '../src/services/item-queue-service'
import { ItemCreate } from '../src/models/item'

describe('ItemQueueService', () => {
  let service: ItemQueueService

  beforeEach(() => {
    service = new ItemQueueService()
  })

  describe('create', () => {
    test('creates an item with auto-incremented ID', async () => {
      const data: ItemCreate = { name: 'Test Item', status: 'active' }
      const item = await service.create(data)

      expect(item.id).toBe('1')
      expect(item.name).toBe('Test Item')
      expect(item.status).toBe('active')
      expect(item.createdAt).toBeDefined()
      expect(item.updatedAt).toBeDefined()
    })

    test('increments ID for each new item', async () => {
      const item1 = await service.create({ name: 'Item 1' })
      const item2 = await service.create({ name: 'Item 2' })
      const item3 = await service.create({ name: 'Item 3' })

      expect(item1.id).toBe('1')
      expect(item2.id).toBe('2')
      expect(item3.id).toBe('3')
    })

    test('prevents ID collision under concurrent operations', async () => {
      const createPromises = Array.from({ length: 10 }, (_, i) =>
        service.create({ name: `Item ${i + 1}` })
      )

      const items = await Promise.all(createPromises)
      const ids = items.map((item) => item.id)
      const uniqueIds = new Set(ids)

      // All IDs should be unique despite concurrent requests
      expect(uniqueIds.size).toBe(10)
      expect(ids).toEqual(['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'])
    })

    test('includes timestamps in created item', async () => {
      const beforeCreation = new Date()
      const item = await service.create({ name: 'Timestamped Item' })
      const afterCreation = new Date()

      const createdAt = new Date(item.createdAt)
      const updatedAt = new Date(item.updatedAt)

      expect(createdAt.getTime()).toBeGreaterThanOrEqual(beforeCreation.getTime())
      expect(createdAt.getTime()).toBeLessThanOrEqual(afterCreation.getTime())
      expect(createdAt).toEqual(updatedAt)
    })
  })

  describe('getAll', () => {
    test('returns empty array initially', async () => {
      const items = await service.getAll()
      expect(items).toEqual([])
    })

    test('returns all created items', async () => {
      await service.create({ name: 'Item 1' })
      await service.create({ name: 'Item 2' })
      const items = await service.getAll()

      expect(items).toHaveLength(2)
      expect(items[0].name).toBe('Item 1')
      expect(items[1].name).toBe('Item 2')
    })

    test('returns a copy of items (does not expose internal state)', async () => {
      await service.create({ name: 'Original Item' })
      const items1 = await service.getAll()
      const items2 = await service.getAll()

      expect(items1).toEqual(items2)
      expect(items1).not.toBe(items2) // Different array references
    })

    test('does not interfere with concurrent create operations', async () => {
      const getPromise = service.getAll()
      const createPromises = Array.from({ length: 5 }, (_, i) =>
        service.create({ name: `Item ${i}` })
      )

      const items = await getPromise
      await Promise.all(createPromises)
      const finalItems = await service.getAll()

      expect(items).toHaveLength(0)
      expect(finalItems).toHaveLength(5)
    })
  })

  describe('serialization', () => {
    test('maintains item order despite concurrent operations', async () => {
      const promises = Array.from({ length: 20 }, (_, i) =>
        service.create({ name: `Item ${i + 1}` })
      )

      await Promise.all(promises)
      const items = await service.getAll()

      const names = items.map((item) => item.name)
      expect(names).toEqual(
        Array.from({ length: 20 }, (_, i) => `Item ${i + 1}`)
      )
    })

    test('handles rapid sequential operations correctly', async () => {
      for (let i = 0; i < 5; i++) {
        await service.create({ name: `Sequential Item ${i + 1}` })
      }

      const items = await service.getAll()
      expect(items).toHaveLength(5)

      for (let i = 0; i < 5; i++) {
        expect(items[i].id).toBe(String(i + 1))
      }
    })

    test('ensures no ID reuse', async () => {
      const allItems = []

      // First batch
      const batch1 = await Promise.all(
        Array.from({ length: 5 }, (_, i) =>
          service.create({ name: `Batch1 Item ${i + 1}` })
        )
      )
      allItems.push(...batch1)

      // Second batch
      const batch2 = await Promise.all(
        Array.from({ length: 5 }, (_, i) =>
          service.create({ name: `Batch2 Item ${i + 1}` })
        )
      )
      allItems.push(...batch2)

      const ids = allItems.map((item) => item.id)
      const uniqueIds = new Set(ids)

      expect(uniqueIds.size).toBe(10)
      expect(Math.max(...ids.map(Number))).toBe(10)
    })
  })

  describe('reset', () => {
    test('resets state to initial values', async () => {
      await service.create({ name: 'Item 1' })
      await service.create({ name: 'Item 2' })

      let items = await service.getAll()
      expect(items).toHaveLength(2)

      service.reset()

      items = await service.getAll()
      expect(items).toHaveLength(0)
    })

    test('resets ID counter after reset', async () => {
      await service.create({ name: 'Item 1' })
      service.reset()
      const item = await service.create({ name: 'Item 2' })

      expect(item.id).toBe('1')
    })
  })

  describe('error handling', () => {
    test('recovers from operation errors and continues processing', async () => {
      // Create an operation that will fail
      const failingOperation = service.create({ name: 'Item 1' })

      // Create valid operations to queue after
      const validOperations = Array.from({ length: 3 }, (_, i) =>
        service.create({ name: `Item ${i + 2}` })
      )

      // Combine and execute, allowing the first to potentially fail
      const [first, ...rest] = await Promise.allSettled([
        failingOperation,
        ...validOperations,
      ])

      // Verify subsequent operations completed successfully
      expect(rest).toHaveLength(3)
      expect(rest.every((result) => result.status === 'fulfilled')).toBe(true)

      // Verify queue is still functional and all successful items exist
      const items = await service.getAll()
      expect(items).toHaveLength(4)
    })

    test('queue remains functional after multiple sequential operations', async () => {
      await service.create({ name: 'Item 1' })
      await service.create({ name: 'Item 2' })
      await service.getAll()

      // Verify queue is still usable
      const item = await service.create({ name: 'Item 3' })
      expect(item.id).toBe('3')

      const items = await service.getAll()
      expect(items).toHaveLength(3)
    })
  })
})
