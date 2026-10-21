export function debounce<T extends (...args: unknown[]) => void>(fn: T, waitMs: number): T {
  let timeoutId: ReturnType<typeof setTimeout> | undefined

  return ((...args: Parameters<T>) => {
    if (timeoutId) clearTimeout(timeoutId)
    timeoutId = setTimeout(() => fn(...args), waitMs)
  }) as T
}
