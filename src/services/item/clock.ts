/**
 * Time boundary for the item service.
 *
 * The scoring core is pure and takes an explicit timestamp, so the only place
 * that reads the wall clock is this adapter. Tests inject a fixed clock; the
 * app uses `systemClock`.
 */
export interface Clock {
  /** Current time in milliseconds since the Unix epoch. */
  now(): number
}

export const systemClock: Clock = {
  now: () => Date.now(),
}

/** Build a clock frozen at a specific instant. Handy for tests and previews. */
export function fixedClock(instant: number | string | Date): Clock {
  const ms =
    instant instanceof Date
      ? instant.getTime()
      : typeof instant === 'string'
        ? new Date(instant).getTime()
        : instant
  return { now: () => ms }
}
