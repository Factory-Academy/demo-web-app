/**
 * Exponential backoff delay calculation with optional jitter.
 *
 * Jitter spreads retries from many clients so they do not all retry on the
 * same tick (the "thundering herd" problem). Strategies follow the AWS
 * Architecture Blog "Exponential Backoff And Jitter" conventions.
 */

export type JitterStrategy = 'none' | 'full' | 'equal'

export interface BackoffOptions {
  /** Delay for the first retry, before the exponential growth is applied. */
  baseDelayMs: number
  /** Upper bound applied before jitter so delays never grow unbounded. */
  maxDelayMs: number
  /** Growth multiplier per attempt. `2` doubles the delay each time. */
  factor: number
  /** How much randomness to mix into the delay. */
  jitter: JitterStrategy
  /** Injectable RNG in `[0, 1)` for deterministic tests. Defaults to Math.random. */
  random?: () => number
}

export const DEFAULT_BACKOFF: BackoffOptions = {
  baseDelayMs: 100,
  maxDelayMs: 10_000,
  factor: 2,
  jitter: 'full',
}

/**
 * Compute the delay before the retry following a given attempt.
 *
 * @param attempt Zero-based index of the attempt that just failed. The delay
 *   after the first failure uses `attempt = 0`.
 */
export function computeBackoffDelay(
  attempt: number,
  options?: Partial<BackoffOptions>,
): number {
  if (!Number.isInteger(attempt) || attempt < 0) {
    throw new RangeError(`attempt must be a non-negative integer, got ${attempt}`)
  }

  const o: BackoffOptions = { ...DEFAULT_BACKOFF, ...options }
  const rng = o.random ?? Math.random

  const exponential = o.baseDelayMs * Math.pow(o.factor, attempt)
  const capped = Math.min(o.maxDelayMs, exponential)

  switch (o.jitter) {
    case 'none':
      return Math.round(capped)
    case 'full':
      // Uniformly random in [0, capped].
      return Math.round(rng() * capped)
    case 'equal':
      // Half fixed, half random: [capped/2, capped].
      return Math.round(capped / 2 + rng() * (capped / 2))
    default:
      return Math.round(capped)
  }
}
