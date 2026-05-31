export function withTimeout(promise, timeoutMs, timeoutMessage = 'Operation timed out') {
  let timeoutId

  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = window.setTimeout(() => {
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
