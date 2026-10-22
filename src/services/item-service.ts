import { Item } from '@/models/item'
import {
  PriorityLevel,
  ValidationResult,
  computePriority,
  validateItem,
} from '@/lib/item-rules'

export interface ItemServiceOptions {
  /** Injectable clock in ms for deterministic tests. Defaults to Date.now. */
  now?: () => number
}

/**
 * Thin adapter over the pure rules in `@/lib/item-rules`. Its only job is to
 * own the one impure dependency — the wall clock — and delegate scoring and
 * validation to the pure core. The public API is unchanged, so existing
 * callers need no edits.
 */
export class ItemService {
  private readonly now: () => number

  constructor(options: ItemServiceOptions = {}) {
    this.now = options.now ?? Date.now
  }

  calculatePriority(record: Item): PriorityLevel {
    return computePriority(record, this.now())
  }

  validate(data: Partial<Item>): ValidationResult {
    return validateItem(data)
  }
}
