/**
 * Calculate the age of a record in calendar days using UTC date comparison
 * @param createdAt - ISO 8601 timestamp string
 * @returns Age in calendar days (rounded down)
 */
export function calculateAgeDays(createdAt: string): number {
  const now = new Date(Date.now())
  const createdDate = new Date(createdAt)
  
  const ageDays = Math.floor(
    (Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) -
      Date.UTC(
        createdDate.getUTCFullYear(),
        createdDate.getUTCMonth(),
        createdDate.getUTCDate()
      )) /
      86400000
  )
  
  return ageDays
}
