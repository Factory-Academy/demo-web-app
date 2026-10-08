export function debounce<T extends (...args: any[]) => void>(
  callback: T,
  delayMs: number
) {
  let timeoutId: ReturnType<typeof setTimeout> | undefined

  return (...args: Parameters<T>) => {
    if (timeoutId !== undefined) {
      clearTimeout(timeoutId)
    }

    timeoutId = setTimeout(() => {
      callback(...args)
    }, delayMs)
  }
}
