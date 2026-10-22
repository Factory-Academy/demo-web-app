import { Item } from '@/models/item'
import {
  createPriorityStrategy,
  PriorityLevel,
  PriorityResult,
  PriorityStrategy,
  ScoringContext,
} from '@/lib/priority'

export interface ItemServiceOptions {
  /**
   * Strategy used by {@link ItemService.calculatePriority}. Defaults to the
   * built-in `weighted` strategy, which reproduces the original scoring.
   */
  priorityStrategy?: PriorityStrategy
}

export class ItemService {
  private readonly priorityStrategy: PriorityStrategy

  constructor(options: ItemServiceOptions = {}) {
    this.priorityStrategy =
      options.priorityStrategy ?? createPriorityStrategy('weighted')
  }

  /** Bucket an item into a priority level using the configured strategy. */
  calculatePriority(record: Item, context?: ScoringContext): PriorityLevel {
    return this.priorityStrategy.score(record, context).level
  }

  /**
   * Full scoring breakdown (level, numeric score, and reasons) for the item.
   * Useful for debugging or surfacing *why* an item landed in a bucket.
   */
  scorePriority(record: Item, context?: ScoringContext): PriorityResult {
    return this.priorityStrategy.score(record, context)
  }

  validate(data: Partial<Item>): { valid: boolean; errors: string[] } {
    const errors: string[] = []
    if (!data.name?.trim()) errors.push('Name is required')
    if (data.status && !['active', 'pending', 'completed'].includes(data.status)) {
      errors.push('Invalid status')
    }
    return { valid: errors.length === 0, errors }
  }
}
