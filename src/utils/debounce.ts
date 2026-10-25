export function debounce<T extends (...args: unknown[]) => void>(fn: T, delayMs: number) {
  let timeoutId: ReturnType<typeof setTimeout> | undefined
  const normalizedDelayMs = Number.isFinite(delayMs) && delayMs > 0 ? delayMs : 0

  return function debounced(this: ThisParameterType<T>, ...args: Parameters<T>) {
    if (timeoutId !== undefined) clearTimeout(timeoutId)
    timeoutId = setTimeout(() => fn.apply(this, args), normalizedDelayMs)
  }
}
