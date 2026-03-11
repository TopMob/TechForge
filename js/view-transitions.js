export function withViewTransition(work) {
  if (document.startViewTransition) {
    return document.startViewTransition(() => work())
  }
  work()
  return null
}
