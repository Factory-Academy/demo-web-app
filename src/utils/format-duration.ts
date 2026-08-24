/**
 * Formats a duration in milliseconds to a human-readable string.
 * Examples: "2d 3h 5m 30s", "45s", "1h 15m"
 */
export function formatDuration(ms: number): string {
  // Validate input
  if (!Number.isFinite(ms)) {
    throw new Error(`Invalid duration: expected a finite number, got ${ms}`)
  }

  const absoluteMs = Math.abs(Math.round(ms))

  if (absoluteMs === 0) return '0s'

  const seconds = Math.floor((absoluteMs / 1000) % 60)
  const minutes = Math.floor((absoluteMs / 60000) % 60)
  const hours = Math.floor((absoluteMs / 3600000) % 24)
  const days = Math.floor(absoluteMs / 86400000)

  const parts: string[] = []

  if (days > 0) parts.push(`${days}d`)
  if (hours > 0) parts.push(`${hours}h`)
  if (minutes > 0) parts.push(`${minutes}m`)
  if (seconds > 0) parts.push(`${seconds}s`)

  return parts.join(' ')
}
