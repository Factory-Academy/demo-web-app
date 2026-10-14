import { Item } from '@/models/item'
import { Clock, systemClock } from './item/clock'
import { computePriority, Priority } from './item/priority'
import { validateItem, ValidationResult } from './item/validation'

/**
 * Thin adapter over the pure item core (`./item`).
 *
 * This class owns the only side effect in the module, reading the clock, and
 * delegates all logic to the pure functions. The public API is unchanged, so
 * existing callers keep working; inject a `Clock` to make behavior
 * deterministic in tests.
 */
export class ItemService {
  constructor(private readonly clock: Clock = systemClock) {}

  calculatePriority(record: Item): Priority {
    return computePriority(record, this.clock.now())
  }

  validate(data: Partial<Item>): ValidationResult {
    return validateItem(data)
  }
}
