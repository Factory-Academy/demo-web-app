import { Item } from '@/models/item'

/**
 * Discrete priority buckets, ordered from most to least urgent. Kept in sync
 * with the return type of {@link ItemService.calculatePriority} so strategies
 * are a drop-in replacement for the original hard-coded logic.
 */
export type PriorityLevel = 'critical' | 'high' | 'medium' | 'low'

/** Levels in descending urgency; handy for comparisons and iteration. */
export const PRIORITY_LEVELS: readonly PriorityLevel[] = [
  'critical',
  'high',
  'medium',
  'low',
]

/**
 * Per-call inputs that are not part of the item itself. Keeping the clock here
 * (rather than reading `Date.now()` inside a strategy) makes aging-based
 * scoring deterministic under test.
 */
export interface ScoringContext {
  /** Current time in ms since the epoch. Defaults to `Date.now()`. */
  now?: number
}

/**
 * The outcome of scoring a single item. `score` is a strategy-internal number
 * (not comparable across strategies); `level` is the bucket callers act on;
 * `reasons` explains the decision for logging and debugging.
 */
export interface PriorityResult {
  level: PriorityLevel
  score: number
  reasons: string[]
}

/**
 * A pluggable priority-scoring algorithm. Implementations must be pure with
 * respect to their inputs: the same item and context always yield the same
 * result.
 */
export interface PriorityStrategy {
  /** Stable identifier, also used as the factory registry key. */
  readonly name: string
  /** Score an item into a {@link PriorityResult}. */
  score(item: Item, context?: ScoringContext): PriorityResult
}
