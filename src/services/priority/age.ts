const MS_PER_DAY = 86_400_000

/**
 * Whole days between `createdAt` and `now`, floored. Returns 0 for unparseable
 * timestamps or records dated in the future so a bad date can never inflate a
 * record's priority.
 */
export function ageInDays(createdAt: string, now: number): number {
  const created = new Date(createdAt).getTime()
  if (!Number.isFinite(created)) return 0

  const ageMs = now - created
  if (ageMs <= 0) return 0

  return Math.floor(ageMs / MS_PER_DAY)
}
