import { ItemService } from '@/services/item-service'
import { computePriority, validateItem } from '@/lib/item-rules'
import { MS_PER_DAY } from '@/lib/item-rules/priority'
import { Item } from '@/models/item'

const NOW = Date.UTC(2024, 5, 1)

function daysAgo(n: number): string {
  return new Date(NOW - n * MS_PER_DAY).toISOString()
}

function item(overrides: Partial<Item> = {}): Item {
  return {
    id: '1',
    name: 'Test',
    status: 'active',
    createdAt: daysAgo(0),
    updatedAt: daysAgo(0),
    ...overrides,
  }
}

describe('ItemService (adapter)', () => {
  test('calculatePriority delegates to the pure core with the injected clock', () => {
    const service = new ItemService({ now: () => NOW })
    const record = item({ status: 'urgent', createdAt: daysAgo(60) })
    expect(service.calculatePriority(record)).toBe(computePriority(record, NOW))
    expect(service.calculatePriority(record)).toBe('critical')
  })

  test('the injected clock drives age-based priority', () => {
    const record = item({ status: 'active', createdAt: daysAgo(100) })
    // At NOW the record is 100 days old → score 50 → high.
    expect(new ItemService({ now: () => NOW }).calculatePriority(record)).toBe('high')
    // Rewind the clock to creation time → age 0 → low.
    const atCreation = new Date(record.createdAt).getTime()
    expect(new ItemService({ now: () => atCreation }).calculatePriority(record)).toBe('low')
  })

  test('validate delegates to the pure core', () => {
    const service = new ItemService()
    const data = { name: '', status: 'bogus' }
    expect(service.validate(data)).toEqual(validateItem(data))
  })

  test('defaults to the real clock when no now is supplied', () => {
    const service = new ItemService()
    const level = service.calculatePriority(item({ status: 'urgent' }))
    expect(['critical', 'high', 'medium', 'low']).toContain(level)
  })
})
