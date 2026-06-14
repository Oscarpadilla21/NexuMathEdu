export function withTimeout(
  promise,
  timeoutMs = 30000,
  timeoutMessage = 'La operación tardó demasiado'
) {
  let timeoutId

  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = window.setTimeout(() => {
      console.warn(`[withTimeout] ${timeoutMessage} (${timeoutMs}ms)`)
      reject(new Error(timeoutMessage))
    }, timeoutMs)
  })

  return Promise.race([
    Promise.resolve(promise).finally(() => {
      if (timeoutId) {
        window.clearTimeout(timeoutId)
      }
    }),
    timeoutPromise,
  ])
}
