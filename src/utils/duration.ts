/**
 * Formats milliseconds into a human-readable duration string.
 * @param ms - Duration in milliseconds
 * @returns Formatted duration string (e.g., "1m 30s", "2h 15m")
 */
export function formatDuration(ms: number): string {
  if (ms < 0) return '0ms'
  if (ms < 1000) return `${Math.floor(ms)}ms`

  const seconds = Math.floor(ms / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  const remainingHours = hours % 24
  const remainingMinutes = minutes % 60
  const remainingSeconds = seconds % 60

  const parts: string[] = []

  if (days > 0) parts.push(`${days}d`)
  if (remainingHours > 0) parts.push(`${remainingHours}h`)
  if (remainingMinutes > 0) parts.push(`${remainingMinutes}m`)
  if (remainingSeconds > 0) parts.push(`${remainingSeconds}s`)

  return parts.length > 0 ? parts.join(' ') : '0s'
}
