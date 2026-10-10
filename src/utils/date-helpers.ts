/**
 * Calculate the difference between two dates in milliseconds using UTC timestamps.
 * This avoids timezone-naive comparisons that can produce incorrect results.
 * 
 * @param dateA - First date (or ISO string)
 * @param dateB - Second date (or ISO string) to subtract from dateA
 * @returns The difference in milliseconds (dateA - dateB)
 */
export function getDateDifferenceMs(
  dateA: Date | string,
  dateB: Date | string
): number {
  const timeA = typeof dateA === 'string' ? new Date(dateA).getTime() : dateA.getTime()
  const timeB = typeof dateB === 'string' ? new Date(dateB).getTime() : dateB.getTime()
  
  return timeA - timeB
}

/**
 * Calculate the age of a date in days from now.
 * Returns negative values for future dates.
 * 
 * @param date - The date to calculate age for
 * @returns Age in days (can be negative for future dates)
 */
export function getAgeDays(date: Date | string): number {
  const ageMs = getDateDifferenceMs(new Date(), date)
  return Math.floor(ageMs / 86400000)
}
