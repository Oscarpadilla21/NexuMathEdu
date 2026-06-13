import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronLeft, History, PanelRightOpen, Settings2, X } from 'lucide-react'
import ChatComposer from '../components/chat/ChatComposer'
import ChatMessageBubble from '../components/chat/ChatMessageBubble'
import ChatSettingsPanel from '../components/chat/ChatSettingsPanel'
import ChatThreadList from '../components/chat/ChatThreadList'
import { useAuth } from '../contexts/AuthContext'
import { fetchChatState, sendChatMessage } from '../lib/chatClient'
import { buildDefaultChatSettings, getChatRoleProfile } from '../utils/chatPresets'

function Modal({ open, title, onClose, children, widthClass = 'max-w-2xl' }) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-3 sm:p-4">
      <div className={`flex h-[92svh] w-full ${widthClass} flex-col overflow-hidden rounded-[2rem] bg-white shadow-2xl`}>
        <div className="flex items-center justify-between border-b border-[#ece8f6] px-4 py-4 sm:px-6">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-[#9d31ff]">{title}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-2 rounded-2xl border border-[#ece8f6] bg-white px-3 py-2 text-sm text-slate-700 transition hover:bg-[#f8faff]"
          >
            <X className="h-4 w-4" />
            Cerrar
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">{children}</div>
      </div>
    </div>
  )
}

export default function ChatPage() {
  const { profile, role, session } = useAuth()
  const bottomRef = useRef(null)
  const roleProfile = useMemo(() => getChatRoleProfile(role), [role])

  // Estado principal de la pantalla: conversaciones, mensajes, ajustes y modales.
  const [threads, setThreads] = useState([])
  const [activeThreadId, setActiveThreadId] = useState(null)
  const [messages, setMessages] = useState([])
  const [settings, setSettings] = useState(() => buildDefaultChatSettings(role))
  const [initialLoading, setInitialLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [historyOpen, setHistoryOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)

  useEffect(() => {
    const loadChat = async () => {
      // Sin token no tenemos nada que cargar desde el backend.
      if (!session?.access_token) {
        setInitialLoading(false)
        return
      }

      setInitialLoading(true)
      setError('')

      try {
        // Cargamos hilos y mensajes del usuario desde la funcion de servidor.
        const data = await fetchChatState({ accessToken: session.access_token })
        setThreads(data?.threads || [])
        setActiveThreadId(data?.active_thread_id || null)
        setMessages(data?.messages || [])
        setSettings(data?.active_thread_settings || buildDefaultChatSettings(role, profile?.chat_provider))
      } catch (chatError) {
        setError(chatError?.message || 'No se pudo cargar el historial del chat.')
      } finally {
        setInitialLoading(false)
      }
    }

    void loadChat()
  }, [session?.access_token, role, profile?.chat_provider])

  useEffect(() => {
    // Cuando llegan mensajes nuevos, llevamos la vista al final del hilo.
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages, activeThreadId])

  const handleUpdateSettings = (partial) => {
    if (messages.length > 0) {
      return
    }

    // Mezclamos solo la parte modificada para no perder el resto de ajustes.
    setSettings((current) => ({ ...current, ...partial }))
  }

  const handleSelectThread = async (threadId) => {
    if (!session?.access_token) return

    setError('')
    setHistoryOpen(false)

    try {
      // Traemos el hilo elegido y reemplazamos el estado visible con ese contenido.
      const data = await fetchChatState({ accessToken: session.access_token, threadId })
      setThreads(data?.threads || [])
      setActiveThreadId(data?.active_thread_id || threadId)
      setMessages(data?.messages || [])
      setSettings(data?.active_thread_settings || buildDefaultChatSettings(role, profile?.chat_provider))
    } catch (chatError) {
      setError(chatError?.message || 'No se pudo abrir esa conversacion.')
    }
  }

  const handleNewThread = () => {
    // Reiniciamos el estado local para arrancar una charla nueva, pero conservamos la configuracion elegida.
    setActiveThreadId(null)
    setMessages([])
    setHistoryOpen(false)
    setError('')
  }

  const handleSendMessage = async (content) => {
    if (!session?.access_token) return

    setSending(true)
    setError('')

    try {
      // Enviamos el mensaje y luego sincronizamos todo con la respuesta del servidor.
      const data = await sendChatMessage({
        accessToken: session.access_token,
        message: content,
        threadId: activeThreadId,
        settings,
      })

      setThreads(data?.threads || [])
      setActiveThreadId(data?.thread_id || activeThreadId)
      setMessages(data?.messages || [])
      setSettings(data?.active_thread_settings || settings)
      setHistoryOpen(false)
    } catch (chatError) {
      setError(chatError?.message || 'No se pudo enviar el mensaje.')
    } finally {
      setSending(false)
    }
  }

  // Cambiamos el titulo segun haya o no mensajes visibles.
  const chatHeader = messages.length > 0 ? 'Conversacion activa' : 'Tu chat esta listo'
  const emptyStateText = roleProfile.welcomeText || 'Escribe una pregunta para iniciar una nueva conversacion.'
  const actionGradient = 'from-[#9d31ff] to-[#ff318c]'
  const isSettingsLocked = messages.length > 0
  const defaultChatSettings = buildDefaultChatSettings(role, profile?.chat_provider)

  if (initialLoading) {
    return (
      <div className="relative min-h-[calc(100svh-64px)] overflow-hidden bg-[#f8faff] text-slate-900">
        <div className="absolute left-1/4 top-16 h-72 w-72 rounded-full bg-[#9d31ff]/20 blur-3xl" />
        <div className="absolute right-1/4 top-24 h-72 w-72 rounded-full bg-[#ff318c]/20 blur-3xl" />
        <div className="absolute bottom-0 left-0 h-80 w-80 rounded-full bg-[#9d31ff]/10 blur-3xl" />
        <main className="relative h-[calc(100svh-64px)] w-full overflow-hidden px-3 py-3 sm:px-4 lg:px-6">
          <section className="flex h-full min-h-0 flex-col overflow-hidden rounded-[2rem] border border-[#ece8f6] bg-white shadow-2xl">
            <div className="flex items-center justify-between gap-2 border-b border-[#ece8f6] px-2 py-1 sm:px-3 sm:py-1">
              <div className="space-y-2">
                <div className="h-3 w-36 animate-pulse rounded-full bg-[#f1ecfb]" />
                <div className="h-2 w-24 animate-pulse rounded-full bg-[#f7f4fe]" />
              </div>
              <div className="flex gap-2">
                <div className="h-8 w-24 animate-pulse rounded-2xl bg-[#f1ecfb]" />
                <div className="h-8 w-24 animate-pulse rounded-2xl bg-[#f1ecfb]" />
                <div className="h-8 w-28 animate-pulse rounded-2xl bg-[#f1ecfb]" />
              </div>
            </div>
            <div className="flex min-h-0 flex-1 flex-col p-4 sm:p-6">
              <div className="mb-4 h-24 animate-pulse rounded-[2rem] bg-[#faf8ff]" />
              <div className="flex-1 rounded-[2rem] bg-[#f8faff]" />
              <div className="mt-4 h-16 animate-pulse rounded-[1.5rem] bg-[#faf8ff]" />
            </div>
          </section>
        </main>
      </div>
    )
  }

  return (
    <div className="relative min-h-[calc(100svh-64px)] overflow-hidden bg-[#f8faff] text-slate-900">
      <div className="absolute left-1/4 top-16 h-72 w-72 rounded-full bg-[#9d31ff]/20 blur-3xl" />
      <div className="absolute right-1/4 top-24 h-72 w-72 rounded-full bg-[#ff318c]/20 blur-3xl" />
      <div className="absolute bottom-0 left-0 h-80 w-80 rounded-full bg-[#9d31ff]/10 blur-3xl" />

      {/* Contenedor principal de la experiencia de chat. */}
      <main className="relative h-[calc(100svh-64px)] w-full overflow-hidden px-3 py-3 sm:px-4 lg:px-6">
        <section className="flex h-full min-h-0 flex-col overflow-hidden rounded-[2rem] border border-[#ece8f6] bg-white shadow-2xl">
          <div className="flex items-center justify-between gap-2 border-b border-[#ece8f6] px-2 py-1 sm:px-3 sm:py-1">
            <div className="min-w-0 leading-none">
              <h1 className="truncate text-sm font-semibold text-slate-900 sm:text-base">{chatHeader}</h1>
              <p className="hidden truncate text-[10px] text-slate-500 sm:block sm:text-[10px]">
                Rol: {roleProfile.label.toLowerCase()}
              </p>
            </div>

            <div className="flex flex-shrink-0 items-center gap-1">
              <button
                type="button"
                onClick={handleNewThread}
                className={`inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r ${actionGradient} px-2.5 py-2 text-[11px] font-semibold text-white shadow-lg transition hover:brightness-110 sm:px-3 sm:py-2 sm:text-xs lg:text-sm`}
              >
                <ChevronLeft className="h-4 w-4" />
                <span className="hidden sm:inline">Nuevo chat</span>
              </button>
              <button
                type="button"
                onClick={() => setHistoryOpen(true)}
                className="inline-flex items-center gap-2 rounded-2xl border border-[#ece8f6] bg-white px-2.5 py-2 text-[11px] font-semibold text-slate-700 transition hover:bg-[#f8faff] sm:px-3 sm:py-2 sm:text-xs lg:text-sm"
              >
                <History className="h-4 w-4" />
                <span className="hidden sm:inline">Historial</span>
              </button>
              <button
                type="button"
                onClick={() => setSettingsOpen(true)}
                className="inline-flex items-center gap-2 rounded-2xl border border-[#ece8f6] bg-white px-2.5 py-2 text-[11px] font-semibold text-slate-700 transition hover:bg-[#f8faff] sm:px-3 sm:py-2 sm:text-xs lg:text-sm"
              >
                <Settings2 className="h-4 w-4" />
                <span className="hidden sm:inline">Configuracion</span>
              </button>
            </div>
          </div>

          {error && (
            <div className="mx-4 mt-4 rounded-2xl border border-[#ffd4e7] bg-[#fff5fb] px-4 py-3 text-sm text-[#9d31ff] sm:mx-6">
              {error}
            </div>
          )}

          <div className="flex min-h-0 flex-1 flex-col">
            <div className="min-h-0 flex-1 overflow-y-auto bg-[linear-gradient(180deg,_#ffffff_0%,_#fffafe_100%)] px-3 py-3 sm:px-6 sm:py-4">
              <div className="space-y-4">
                {messages.length > 0 ? (
                  messages.map((message) => {
                    const isUser = message.sender_role !== 'assistant'

                    return (
                      <ChatMessageBubble
                        key={message.id}
                        message={message}
                        isUser={isUser}
                        accentClass={roleProfile.accent}
                      />
                    )
                  })
                ) : (
                  <div className="grid min-h-[30vh] place-items-center rounded-[2rem] border border-dashed border-[#ece8f6] bg-[#fafafa] px-6 py-10 text-center">
                    <div className="max-w-xl">
                      <div className={`mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br ${roleProfile.accent} shadow-lg ${roleProfile.glow}`}>
                        <PanelRightOpen className="h-7 w-7 text-white" />
                      </div>
                      <h3 className="mt-5 text-xl font-semibold text-slate-900">{roleProfile.welcomeTitle}</h3>
                      <p className="mt-3 text-sm leading-6 text-slate-600">{emptyStateText}</p>
                    </div>
                  </div>
                )}
                <div ref={bottomRef} />
              </div>
            </div>

            <ChatComposer
              onSend={handleSendMessage}
              placeholder={`Pregunta como ${roleProfile.label.toLowerCase()}...`}
              disabled={sending || !session?.access_token}
              sending={sending}
            />
          </div>
        </section>
      </main>

      <Modal open={historyOpen} title="Historial" onClose={() => setHistoryOpen(false)} widthClass="max-w-3xl">
        <ChatThreadList
          threads={threads}
          activeThreadId={activeThreadId}
          onSelectThread={handleSelectThread}
          onNewThread={handleNewThread}
          profileLabel={roleProfile.welcomeTitle}
          profileText={roleProfile.welcomeText}
          profileAccent={roleProfile.accent}
        />
      </Modal>

      <Modal open={settingsOpen} title="Configuracion" onClose={() => setSettingsOpen(false)} widthClass="max-w-2xl">
        <ChatSettingsPanel
          role={role}
          settings={settings}
          onChange={handleUpdateSettings}
          onReset={() => setSettings(defaultChatSettings)}
          profileAccent={roleProfile.accent}
          disabled={isSettingsLocked}
        />
      </Modal>
    </div>
  )
}
