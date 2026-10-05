/**
 * The lifecycle states an item can occupy. These are the single source of
 * truth for valid statuses; services and request handlers should reference
 * {@link ITEM_STATES} rather than hard-coding string literals.
 */
export type ItemStatus = 'pending' | 'active' | 'completed' | 'cancelled'

/**
 * Canonical, ordered list of valid item statuses.
 */
export const ITEM_STATES: readonly ItemStatus[] = [
  'pending',
  'active',
  'completed',
  'cancelled',
]

export interface Item {
  id: string
  name: string
  description?: string
  status: ItemStatus
  createdAt: string
  updatedAt: string
}

export interface ItemCreate {
  name: string
  description?: string
  status?: ItemStatus
}
