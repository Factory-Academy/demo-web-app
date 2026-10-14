import { ItemService } from '@/services/item-service'
import { fixedClock } from '@/services/item/clock'
import { MS_PER_DAY } from '@/services/item/priority'
import { Item } from '@/models/item'

const NOW = new Date('2026-01-01T00:00:00.000Z').getTime()

function makeItem(overrides: Partial<Item> = {}): Item {
  return {
    id: '1',
    name: 'Example',
    status: 'active',
    createdAt: new Date(NOW).toISOString(),
    updatedAt: new Date(NOW).toISOString(),
    ...overrides,
  }
}

describe('ItemService adapter', () => {
  const service = new ItemService(fixedClock(NOW))

  test('calculatePriority uses the injected clock for a deterministic result', () => {
    const old = makeItem({ createdAt: new Date(NOW - 160 * MS_PER_DAY).toISOString() })
    expect(service.calculatePriority(old)).toBe('critical')
  })

  test('calculatePriority treats a fresh active item as low', () => {
    expect(service.calculatePriority(makeItem())).toBe('low')
  })

  test('calculatePriority treats a fresh urgent item as high', () => {
    expect(service.calculatePriority(makeItem({ status: 'urgent' }))).toBe('high')
  })

  test('validate delegates to the pure validator', () => {
    expect(service.validate({ name: '' }).valid).toBe(false)
    expect(service.validate({ name: 'ok', status: 'active' }).valid).toBe(true)
  })

  test('defaults to the system clock when none is injected', () => {
    const defaultService = new ItemService()
    const label = defaultService.calculatePriority(makeItem())
    expect(['critical', 'high', 'medium', 'low']).toContain(label)
  })

  test('matches the original algorithm across representative inputs', () => {
    // Reference implementation lifted verbatim from the pre-refactor module,
    // run against the same fixed clock to prove behavior is preserved.
    const original = (record: Item): string => {
      const ageMs = NOW - new Date(record.createdAt).getTime()
      const ageDays = Math.floor(ageMs / 86400000)
      let baseScore = 0
      if (record.status === 'urgent') baseScore += 50
      if (ageDays > 30) baseScore += ageDays * 0.5
      if (baseScore >= 80) return 'critical'
      if (baseScore >= 50) return 'high'
      if (baseScore >= 20) return 'medium'
      return 'low'
    }

    const cases: Item[] = [
      makeItem(),
      makeItem({ status: 'urgent' }),
      makeItem({ createdAt: new Date(NOW - 30 * MS_PER_DAY).toISOString() }),
      makeItem({ createdAt: new Date(NOW - 31 * MS_PER_DAY).toISOString() }),
      makeItem({ createdAt: new Date(NOW - 40 * MS_PER_DAY).toISOString() }),
      makeItem({ createdAt: new Date(NOW - 100 * MS_PER_DAY).toISOString() }),
      makeItem({ createdAt: new Date(NOW - 160 * MS_PER_DAY).toISOString() }),
      makeItem({ status: 'urgent', createdAt: new Date(NOW - 59 * MS_PER_DAY).toISOString() }),
      makeItem({ status: 'urgent', createdAt: new Date(NOW - 60 * MS_PER_DAY).toISOString() }),
      makeItem({ createdAt: new Date(NOW + 5 * MS_PER_DAY).toISOString() }),
    ]

    for (const item of cases) {
      expect(service.calculatePriority(item)).toBe(original(item))
    }
  })
})
