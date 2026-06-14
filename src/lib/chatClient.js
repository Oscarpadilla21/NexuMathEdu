const resolveBaseUrl = () => {
  // Prioridad: URL explicita del endpoint, luego la base de Supabase, luego ruta relativa.
  const envUrl = import.meta.env.VITE_CHAT_API_URL

  if (envUrl) {
    return envUrl.replace(/\/$/, '')
  }

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
  return supabaseUrl ? `${supabaseUrl.replace(/\/$/, '')}/functions/v1/chat` : '/functions/v1/chat'
}

async function requestChat(path, { accessToken, method = 'GET', body } = {}) {
  // Wrapper comun para todas las llamadas al endpoint de chat.
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
    // Centralizamos el mensaje de error para que la UI no repita la misma logica.
    throw new Error(payload?.error || payload?.message || 'No se pudo conectar con el chat')
  }

  return payload
}

export function fetchChatState({ accessToken, threadId, userId } = {}) {
  const params = new URLSearchParams()
  if (threadId) params.set('thread_id', threadId)
  if (userId) params.set('user_id', userId)
  const query = params.toString() ? `?${params.toString()}` : ''
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
