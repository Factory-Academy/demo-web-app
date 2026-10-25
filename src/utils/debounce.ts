export function debounce<T extends (...args: unknown[]) => void>(fn: T, delayMs: number) {
  let timeoutId: ReturnType<typeof setTimeout> | undefined

  return function debounced(this: ThisParameterType<T>, ...args: Parameters<T>) {
    if (timeoutId !== undefined) clearTimeout(timeoutId)
    timeoutId = setTimeout(() => fn.apply(this, args), delayMs)
  }
}
