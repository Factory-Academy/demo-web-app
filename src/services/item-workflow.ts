import { Item, ItemStatus, ITEM_STATES } from '@/models/item'
import { StateMachine } from '@/utils/state-machine'

/**
 * Events that drive an item through its lifecycle.
 */
export type ItemEvent = 'activate' | 'complete' | 'cancel' | 'reopen'

/**
 * The complete set of lifecycle events, useful for request validation.
 */
export const ITEM_EVENTS: readonly ItemEvent[] = [
  'activate',
  'complete',
  'cancel',
  'reopen',
]

/**
 * The item lifecycle expressed as a state machine.
 *
 *   pending ──activate──▶ active ──complete──▶ completed
 *      │                    │                      │
 *      └──────cancel────────┴───▶ cancelled        │
 *                                   │               │
 *                                   └──reopen──┐    │
 *                                              ▼    ▼
 *                                            pending ◀──reopen
 *
 * Keeping the transitions in one place means every call site rejects the
 * same illegal moves (for example completing a `pending` item) instead of
 * each one re-deriving the rules and drifting apart.
 */
export const itemStateMachine = new StateMachine<ItemStatus, ItemEvent>({
  initial: 'pending',
  states: ITEM_STATES,
  transitions: [
    { from: 'pending', event: 'activate', to: 'active' },
    { from: 'active', event: 'complete', to: 'completed' },
    { from: ['pending', 'active'], event: 'cancel', to: 'cancelled' },
    { from: ['completed', 'cancelled'], event: 'reopen', to: 'pending' },
  ],
})

/**
 * Minimal persistence contract the workflow drives. Both methods may be
 * synchronous or asynchronous; the workflow always awaits them.
 */
export interface ItemStore {
  get(id: string): Item | undefined | Promise<Item | undefined>
  save(item: Item): void | Promise<void>
}

/**
 * Outcome of sending an event to the workflow.
 */
export interface WorkflowResult {
  ok: boolean
  item?: Item
  state?: ItemStatus
  error?: string
}

export interface ItemWorkflowOptions {
  machine?: StateMachine<ItemStatus, ItemEvent>
  /** Clock used for `updatedAt`; injectable so tests stay deterministic. */
  now?: () => string
}

const noop = (): void => {}

/**
 * Coordinates item lifecycle transitions against a backing store.
 *
 * The important guarantee is that transitions for a given item id are
 * applied one at a time. Each request re-reads the latest persisted state
 * inside its turn, so two in-flight requests can never both act on the same
 * stale status and leave the item in an inconsistent state.
 */
export class ItemWorkflow {
  private readonly store: ItemStore
  private readonly machine: StateMachine<ItemStatus, ItemEvent>
  private readonly now: () => string
  // Per-id tail of the serialized transition chain.
  private readonly locks = new Map<string, Promise<void>>()

  constructor(store: ItemStore, options: ItemWorkflowOptions = {}) {
    this.store = store
    this.machine = options.machine ?? itemStateMachine
    this.now = options.now ?? (() => new Date().toISOString())
  }

  /**
   * Whether `event` is currently valid from `status`.
   */
  can(status: ItemStatus, event: ItemEvent): boolean {
    return this.machine.can(status, event)
  }

  /**
   * The events accepted from `status`.
   */
  availableEvents(status: ItemStatus): ItemEvent[] {
    return this.machine.availableEvents(status)
  }

  /**
   * Apply a lifecycle event to the item with the given id.
   *
   * Resolves with `ok: false` (and the item left untouched) when the item
   * does not exist or the event is not allowed from its current state.
   */
  async send(id: string, event: ItemEvent): Promise<WorkflowResult> {
    return this.serialize(id, async () => {
      const current = await this.store.get(id)
      if (!current) {
        return { ok: false, error: `Item "${id}" not found` }
      }

      const result = this.machine.transition(current.status, event)
      if (!result.ok) {
        return {
          ok: false,
          item: current,
          state: current.status,
          error: result.error,
        }
      }

      // A no-op transition still succeeds but must not touch the store.
      if (!result.changed) {
        return { ok: true, item: current, state: current.status }
      }

      const updated: Item = {
        ...current,
        status: result.state,
        updatedAt: this.now(),
      }
      await this.store.save(updated)
      return { ok: true, item: updated, state: updated.status }
    })
  }

  /**
   * Run `task` after any in-flight task for the same id has settled,
   * serializing transitions per item. The stored tail swallows rejections
   * so one failed task never stalls the chain for later ones.
   */
  private serialize<T>(key: string, task: () => Promise<T>): Promise<T> {
    const previous = this.locks.get(key) ?? Promise.resolve()
    const run = previous.then(task, task)
    const tail = run.then(noop, noop)
    this.locks.set(key, tail)

    tail.then(() => {
      // Drop the lock once this task is the last one in the chain to avoid
      // retaining a promise per id forever.
      if (this.locks.get(key) === tail) {
        this.locks.delete(key)
      }
    }, noop)

    return run
  }
}
