const resolveBaseUrl = () => {
  const envUrl = import.meta.env.VITE_CHAT_API_URL

  if (envUrl) {
    return envUrl.replace(/\/$/, '')
  }

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
  return supabaseUrl ? `${supabaseUrl.replace(/\/$/, '')}/functions/v1/chat` : '/functions/v1/chat'
}

async function requestChat(path, { accessToken, method = 'GET', body } = {}) {
  const response = await fetch(`${resolveBaseUrl()}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  })

  const payload = await response.json().catch(() => null)

  if (!response.ok) {
    throw new Error(payload?.error || payload?.message || 'No se pudo conectar con el chat')
  }

  return payload
}

export function fetchChatState({ accessToken, threadId } = {}) {
  const query = threadId ? `?thread_id=${encodeURIComponent(threadId)}` : ''
  return requestChat(query, { accessToken, method: 'GET' })
}

export function sendChatMessage({ accessToken, message, threadId, settings }) {
  return requestChat('', {
    accessToken,
    method: 'POST',
    body: {
      message,
      thread_id: threadId || undefined,
      settings,
    },
  })
}
