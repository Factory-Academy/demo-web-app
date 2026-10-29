import { Item } from '@/models/item'
import {
  createPriorityStrategy,
  DEFAULT_PRIORITY_STRATEGY,
  PriorityLevel,
  PriorityStrategy,
  PriorityStrategyKey,
  scoreToLevel,
} from '@/services/priority'

export class ItemService {
  private readonly priorityStrategy: PriorityStrategy

  constructor(strategy: PriorityStrategyKey | PriorityStrategy = DEFAULT_PRIORITY_STRATEGY) {
    this.priorityStrategy =
      typeof strategy === 'string' ? createPriorityStrategy(strategy) : strategy
  }

  calculatePriority(record: Item, now: number = Date.now()): PriorityLevel {
    const score = this.priorityStrategy.score(record, { now })
    return scoreToLevel(score)
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
