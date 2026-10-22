import { Item } from '@/models/item'
import { ScoringContext } from './types'

const MS_PER_DAY = 86_400_000

/**
 * Age of an item in whole days, relative to the context clock.
 *
 * Defensive on two fronts so a strategy never has to repeat the checks:
 *  - An unparseable `createdAt` yields `0` rather than `NaN`, matching the
 *    original `calculatePriority`, which simply skipped the aging bonus when
 *    the date math produced `NaN`.
 *  - A `createdAt` in the future (clock skew, bad data) is clamped to `0`
 *    instead of going negative.
 */
export function ageInDays(item: Item, context?: ScoringContext): number {
  const now = context?.now ?? Date.now()
  const created = new Date(item.createdAt).getTime()
  if (!Number.isFinite(created)) return 0
  const ageMs = now - created
  if (ageMs <= 0) return 0
  return Math.floor(ageMs / MS_PER_DAY)
}
