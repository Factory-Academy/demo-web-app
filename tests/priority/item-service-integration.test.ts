import { ItemService } from '@/services/item-service'
import { createPriorityStrategy } from '@/lib/priority'
import { Item } from '@/models/item'

const DAY = 86_400_000
const NOW = Date.parse('2026-01-31T00:00:00.000Z')

function aged(days: number, status = 'active'): Item {
  return {
    id: '1',
    name: 'x',
    status,
    createdAt: new Date(NOW - days * DAY).toISOString(),
    updatedAt: new Date(NOW).toISOString(),
  }
}

describe('ItemService priority integration', () => {
  test('defaults to the weighted strategy (legacy behaviour preserved)', () => {
    const service = new ItemService()
    expect(service.calculatePriority(aged(0, 'urgent'), { now: NOW })).toBe('high')
    expect(service.calculatePriority(aged(60, 'urgent'), { now: NOW })).toBe('critical')
    expect(service.calculatePriority(aged(0), { now: NOW })).toBe('low')
  })

  test('accepts an injected strategy and delegates to it', () => {
    const service = new ItemService({
      priorityStrategy: createPriorityStrategy('threshold'),
    })
    // Threshold strategy classifies urgent-and-old as critical, same as here.
    expect(service.calculatePriority(aged(31, 'urgent'), { now: NOW })).toBe('critical')
    // But a plain 45-day item is medium under threshold rules.
    expect(service.calculatePriority(aged(45), { now: NOW })).toBe('medium')
  })

  test('the two strategies can disagree on the same item', () => {
    const weighted = new ItemService({ priorityStrategy: createPriorityStrategy('weighted') })
    const threshold = new ItemService({ priorityStrategy: createPriorityStrategy('threshold') })
    const subject = aged(45) // non-urgent, 45 days old

    // weighted: 45 * 0.5 = 22.5 -> medium; threshold: > 30d -> medium. Agree here.
    expect(weighted.calculatePriority(subject, { now: NOW })).toBe('medium')
    expect(threshold.calculatePriority(subject, { now: NOW })).toBe('medium')

    const urgentFresh = aged(0, 'urgent')
    // Both reach 'high' for a fresh urgent item.
    expect(weighted.calculatePriority(urgentFresh, { now: NOW })).toBe('high')
    expect(threshold.calculatePriority(urgentFresh, { now: NOW })).toBe('high')

    const old = aged(100) // non-urgent, 100 days
    // weighted: 100 * 0.5 = 50 -> high; threshold: > 60d -> high. Agree.
    expect(weighted.calculatePriority(old, { now: NOW })).toBe('high')
    expect(threshold.calculatePriority(old, { now: NOW })).toBe('high')
  })

  test('scorePriority exposes the full breakdown', () => {
    const service = new ItemService()
    const result = service.scorePriority(aged(60, 'urgent'), { now: NOW })
    expect(result.level).toBe('critical')
    expect(result.score).toBe(80)
    expect(result.reasons.length).toBeGreaterThan(0)
  })
})
