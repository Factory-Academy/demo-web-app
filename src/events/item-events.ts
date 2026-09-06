import { EventEmitter } from '@/lib/event-emitter'
import { Item } from '@/models/item'

export type ItemPriority = 'critical' | 'high' | 'medium' | 'low'

/**
 * The typed contract for everything that can happen to an item. Adding an entry
 * here immediately type-checks every `emit`/`on` call across the app.
 */
export interface ItemEventMap {
  'item:created': { item: Item; priority: ItemPriority }
  'item:updated': { item: Item; changes: Partial<Item> }
  'item:validation_failed': { input: Partial<Item>; errors: string[] }
  'item:priority_changed': {
    item: Item
    from: ItemPriority
    to: ItemPriority
  }
}

export type ItemEventName = keyof ItemEventMap

/**
 * A shared, app-wide emitter for item events. Modules import this single
 * instance so publishers and subscribers meet on the same bus. Tests that need
 * isolation can construct their own `EventEmitter<ItemEventMap>` instead.
 */
export const itemEvents = new EventEmitter<ItemEventMap>()
