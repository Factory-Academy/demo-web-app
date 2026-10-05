/**
 * Formats a duration in milliseconds to a human-readable string
 * @param ms - Duration in milliseconds
 * @returns Formatted duration string (e.g., "2.5s", "1m 30s", "1h 5m")
 */
export function formatDuration(ms: number): string {
  if (ms < 0) return '0ms'
  if (ms < 1000) return `${Math.round(ms)}ms`

  const seconds = ms / 1000
  if (seconds < 60) return `${seconds.toFixed(1)}s`.replace(/\.0s$/, 's')

  const minutes = seconds / 60
  if (minutes < 60) {
    const mins = Math.floor(minutes)
    const secs = Math.round((seconds % 60))
    return secs === 0 ? `${mins}m` : `${mins}m ${secs}s`
  }

  const hours = minutes / 60
  const hrs = Math.floor(hours)
  const mins = Math.floor(minutes % 60)
  return mins === 0 ? `${hrs}h` : `${hrs}h ${mins}m`
}
