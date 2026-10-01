/**
 * Calculate the age of a record in days based on its creation timestamp
 * @param createdAt - ISO 8601 timestamp string
 * @returns Age in days (rounded down)
 */
export function calculateAgeDays(createdAt: string): number {
  const ageMs = Date.now() - new Date(createdAt).getTime()
  const MILLISECONDS_PER_DAY = 86400000
  return Math.floor(ageMs / MILLISECONDS_PER_DAY)
}
