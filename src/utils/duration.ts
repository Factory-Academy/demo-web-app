/**
 * Formats a duration in milliseconds to a human-readable string.
 * @param milliseconds - The duration in milliseconds
 * @returns A formatted string (e.g., "1.5s", "2m 30s", "1h 15m")
 */
export function formatDuration(milliseconds: number): string {
  if (milliseconds < 0) {
    return '0ms'
  }

  if (milliseconds < 1000) {
    return `${Math.round(milliseconds)}ms`
  }

  const seconds = Math.floor(milliseconds / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)

  if (hours > 0) {
    const remainingMinutes = minutes % 60
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`
  }

  if (minutes > 0) {
    const remainingSeconds = seconds % 60
    return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`
  }

  if (seconds >= 10) {
    return `${seconds}s`
  }

  // For sub-10 seconds, show one decimal place
  return `${(milliseconds / 1000).toFixed(1)}s`
}
