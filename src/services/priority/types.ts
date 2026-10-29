import { Item } from '@/models/item'

export type PriorityLevel = 'critical' | 'high' | 'medium' | 'low'

export interface PriorityContext {
  /**
   * Reference timestamp (ms since epoch) used for age calculations. Defaults
   * to `Date.now()`. Injecting it keeps scoring deterministic under test.
   */
  now?: number
}

export interface PriorityStrategy {
  /** Stable identifier used by the factory and for logging/telemetry. */
  readonly key: string
  /** Human-readable label for UI or debugging. */
  readonly label: string
  /**
   * Compute a priority score for a record. Implementations should return a
   * non-negative number; the caller maps it to a {@link PriorityLevel} via a
   * shared threshold table so every strategy shares one meaning of "critical".
   */
  score(record: Item, context?: PriorityContext): number
}
