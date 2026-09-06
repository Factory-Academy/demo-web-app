import { EventEmitter, Unsubscribe } from '@/lib/event-emitter'
import { ItemEventMap, itemEvents } from '@/events/item-events'

export interface ActivityEntry {
  event: keyof ItemEventMap
  at: string
}

/**
 * A small in-memory audit trail driven entirely by the event bus. It shows the
 * intended pub/sub pattern: a cross-cutting concern subscribes with `onAny` and
 * stays fully decoupled from the code that publishes events.
 */
export class ItemActivityLog {
  private readonly entries: ActivityEntry[] = []
  private readonly stop: Unsubscribe

  constructor(bus: EventEmitter<ItemEventMap> = itemEvents) {
    this.stop = bus.onAny((event) => {
      this.entries.push({ event, at: new Date().toISOString() })
    })
  }

  /** A defensive copy of the recorded entries, newest last. */
  history(): ActivityEntry[] {
    return this.entries.slice()
  }

  count(event?: keyof ItemEventMap): number {
    if (event === undefined) return this.entries.length
    return this.entries.filter((entry) => entry.event === event).length
  }

  /** Detach from the bus. The log keeps whatever it already recorded. */
  dispose(): void {
    this.stop()
  }
}
