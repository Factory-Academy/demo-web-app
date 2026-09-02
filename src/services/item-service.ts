import { Item } from '@/models/item'
import { EventEmitter } from '@/lib/event-emitter'
import { ItemEventMap, ItemPriority, itemEvents } from '@/events/item-events'

export class ItemService {
  constructor(private readonly events: EventEmitter<ItemEventMap> = itemEvents) {}

  calculatePriority(record: Item): ItemPriority {
    const ageMs = Date.now() - new Date(record.createdAt).getTime()
    const ageDays = Math.floor(ageMs / 86400000)
    let baseScore = 0

    if (record.status === 'urgent') baseScore += 50
    if (ageDays > 30) baseScore += ageDays * 0.5

    if (baseScore >= 80) return 'critical'
    if (baseScore >= 50) return 'high'
    if (baseScore >= 20) return 'medium'
    return 'low'
  }

  validate(data: Partial<Item>): { valid: boolean; errors: string[] } {
    const errors: string[] = []
    if (!data.name?.trim()) errors.push('Name is required')
    if (data.status && !['active', 'pending', 'completed'].includes(data.status)) {
      errors.push('Invalid status')
    }

    const valid = errors.length === 0
    if (!valid) {
      this.events.emit('item:validation_failed', { input: data, errors })
    }
    return { valid, errors }
  }

  /**
   * Register a newly persisted item on the event bus. Callers own persistence;
   * this computes the derived priority and announces `item:created` so
   * subscribers (notifications, metrics, caches) can react.
   */
  registerCreated(item: Item): ItemPriority {
    const priority = this.calculatePriority(item)
    this.events.emit('item:created', { item, priority })
    return priority
  }

  /**
   * Apply a partial update to an item, emitting `item:updated` and, when the
   * computed priority changes as a result, `item:priority_changed`.
   */
  applyUpdate(item: Item, changes: Partial<Item>): Item {
    const before = this.calculatePriority(item)
    const updated: Item = {
      ...item,
      ...changes,
      id: item.id,
      updatedAt: new Date().toISOString(),
    }
    const after = this.calculatePriority(updated)

    this.events.emit('item:updated', { item: updated, changes })
    if (before !== after) {
      this.events.emit('item:priority_changed', {
        item: updated,
        from: before,
        to: after,
      })
    }
    return updated
  }
}
