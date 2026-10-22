import { ageInDays } from '@/lib/priority/age'
import { Item } from '@/models/item'

const DAY = 86_400_000

function item(createdAt: string): Item {
  return {
    id: '1',
    name: 'x',
    status: 'active',
    createdAt,
    updatedAt: createdAt,
  }
}

describe('ageInDays', () => {
  const now = Date.parse('2026-01-31T00:00:00.000Z')

  test('computes whole days relative to the context clock', () => {
    const created = new Date(now - 10 * DAY).toISOString()
    expect(ageInDays(item(created), { now })).toBe(10)
  })

  test('floors partial days', () => {
    const created = new Date(now - (3 * DAY + DAY / 2)).toISOString()
    expect(ageInDays(item(created), { now })).toBe(3)
  })

  test('clamps a future createdAt to 0', () => {
    const created = new Date(now + 5 * DAY).toISOString()
    expect(ageInDays(item(created), { now })).toBe(0)
  })

  test('treats an unparseable date as age 0', () => {
    expect(ageInDays(item('not-a-date'), { now })).toBe(0)
  })

  test('falls back to Date.now when no context clock is given', () => {
    const created = new Date(Date.now() - 2 * DAY).toISOString()
    expect(ageInDays(item(created))).toBe(2)
  })
})
