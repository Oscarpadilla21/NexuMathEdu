import { useEffect, useMemo, useRef, useState } from 'react'
import { History, PanelRightOpen, Settings2 } from 'lucide-react'
import ChatComposer from '../components/chat/ChatComposer'
import ChatMessageBubble from '../components/chat/ChatMessageBubble'
import ChatSettingsPanel from '../components/chat/ChatSettingsPanel'
import ChatThreadList from '../components/chat/ChatThreadList'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { fetchChatState, sendChatMessage } from '../lib/chatClient'
import { buildDefaultChatSettings, getChatRoleProfile } from '../utils/chatPresets'

/** Altura del DashboardHeader. Debe coincidir con h-16 (64 px). */
const HEADER_PX = 64

export default function ChatPage() {
  const { profile, role, session } = useAuth()
  const bottomRef = useRef(null)
  const roleProfile = useMemo(() => getChatRoleProfile(role), [role])

  // Estado principal: conversaciones, mensajes, ajustes y sidebars.
  const [threads, setThreads] = useState([])
  const [activeThreadId, setActiveThreadId] = useState(null)
  const [messages, setMessages] = useState([])
  const [settings, setSettings] = useState(() => buildDefaultChatSettings(role))
  const [initialLoading, setInitialLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')

  // Sidebars: abiertas por defecto solo en escritorio.
  const isDesktop = () => window.innerWidth >= 1024
  const [leftOpen, setLeftOpen] = useState(isDesktop)
  const [rightOpen, setRightOpen] = useState(isDesktop)
  const canAuditOthers = role === 'admin' || role === 'teacher'
  const [viewingUserId, setViewingUserId] = useState(null)
  const [chatUsers, setChatUsers] = useState([])

  const auditUserId =
    canAuditOthers && viewingUserId && viewingUserId !== profile?.id ? viewingUserId : null
  const isReadOnlyAudit = Boolean(auditUserId)
  const chatUserFilter = auditUserId || undefined

  const formatChatUserLabel = (user) => {
    const name = user.full_name || user.email || 'Usuario'
    const roleLabels = { admin: 'Admin', teacher: 'Profesor', student: 'Estudiante' }
    return `${name} (${roleLabels[user.role] || user.role})`
  }

  const userFilterConfig = canAuditOthers
    ? {
        label: role === 'teacher' ? 'Ver historial del estudiante' : 'Ver historial de',
        ownLabel: 'Mis conversaciones',
        value: viewingUserId,
        options: chatUsers.map((user) => ({ id: user.id, label: formatChatUserLabel(user) })),
        onChange: (nextUserId) => {
          setViewingUserId(nextUserId)
          setActiveThreadId(null)
          setMessages([])
          setError('')
        },
      }
    : null

  // En resize, si pasamos a escritorio abrimos ambos paneles.
  useEffect(() => {
    const onResize = () => {
      if (isDesktop()) {
        setLeftOpen(true)
        setRightOpen(true)
      } else {
        // En móvil los cerramos para liberar espacio de chat.
        setLeftOpen(false)
        setRightOpen(false)
      }
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  // Carga inicial de hilos y mensajes.
  useEffect(() => {
    const loadChat = async () => {
      if (!session?.access_token) {
        setInitialLoading(false)
        return
      }
      setInitialLoading(true)
      setError('')
      try {
        const data = await fetchChatState({
          accessToken: session.access_token,
          userId: chatUserFilter,
        })
        setThreads(data?.threads || [])
        setActiveThreadId(data?.active_thread_id || null)
        setMessages(data?.messages || [])
        setChatUsers(data?.visible_users || [])
        setSettings(data?.active_thread_settings || buildDefaultChatSettings(role, profile?.chat_provider))
      } catch (err) {
        setError(err?.message || 'No se pudo cargar el historial del chat.')
      } finally {
        setInitialLoading(false)
      }
    }
    void loadChat()
  }, [session?.access_token, role, profile?.chat_provider, profile?.id, chatUserFilter])

  // Scroll automático al último mensaje.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages, activeThreadId])

  const handleUpdateSettings = (partial) => {
    setSettings((cur) => ({ ...cur, ...partial }))
  }

  const [settingsSaved, setSettingsSaved] = useState(false)
  const [saveMessage, setSaveMessage] = useState('')
  const handleSaveSettings = async () => {
    if (!session?.access_token || !profile?.id) return
    setSaveMessage('')
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ chat_provider: settings.provider })
        .eq('id', profile.id)
      if (error) throw error
      setSettingsSaved(true)
      setSaveMessage('Configuración guardada')
      setTimeout(() => setSaveMessage(''), 2500)
    } catch {
      setSaveMessage('Error al guardar')
      setTimeout(() => setSaveMessage(''), 2500)
    }
  }

  const handleSelectThread = async (threadId) => {
    if (!session?.access_token) return
    setError('')
    // En móvil cerramos el drawer al seleccionar un hilo.
    if (!isDesktop()) setLeftOpen(false)
    try {
      const data = await fetchChatState({
        accessToken: session.access_token,
        threadId,
        userId: chatUserFilter,
      })
      setThreads(data?.threads || [])
      setActiveThreadId(data?.active_thread_id || threadId)
      setMessages(data?.messages || [])
      setChatUsers(data?.visible_users || chatUsers)
      setSettings(data?.active_thread_settings || buildDefaultChatSettings(role, profile?.chat_provider))
    } catch (err) {
      setError(err?.message || 'No se pudo abrir esa conversación.')
    }
  }

  const handleNewThread = () => {
    setActiveThreadId(null)
    setMessages([])
    setSettingsSaved(false)
    setError('')
    if (!isDesktop()) setLeftOpen(false)
  }

  const handleSendMessage = async (content) => {
    if (!session?.access_token || isReadOnlyAudit) return
    setSending(true)
    setError('')
    try {
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
    } catch (err) {
      setError(err?.message || 'No se pudo enviar el mensaje.')
    } finally {
      setSending(false)
    }
  }

  const emptyStateText = isReadOnlyAudit
    ? role === 'teacher'
      ? 'Selecciona una conversación del historial de este estudiante.'
      : 'Selecciona una conversación del historial de este usuario.'
    : roleProfile.welcomeText || 'Escribe una pregunta para iniciar una nueva conversación.'
  const isSettingsLocked = isReadOnlyAudit
  const defaultChatSettings = buildDefaultChatSettings(role, profile?.chat_provider)

  // ── Loading skeleton ────────────────────────────────────────────────────────
  if (initialLoading) {
    return (
      <div
        className="relative flex w-full overflow-hidden bg-[#f8faff]"
        style={{ height: `calc(100dvh - ${HEADER_PX}px)` }}
      >
        <div className="flex flex-1 flex-col">
          {/* Header skeleton */}
          <div className="flex h-14 items-center justify-between border-b border-[#ece8f6] bg-white px-4">
            <div className="h-4 w-28 animate-pulse rounded-full bg-[#f1ecfb]" />
            <div className="h-4 w-8 animate-pulse rounded-full bg-[#f1ecfb]" />
          </div>
          {/* Messages skeleton */}
          <div className="flex-1 overflow-hidden p-4 space-y-3">
            {[80, 60, 90, 50].map((w, i) => (
              <div key={i} className={`flex ${i % 2 === 0 ? 'justify-start' : 'justify-end'}`}>
                <div className={`h-8 animate-pulse rounded-xl bg-[#f1ecfb]`} style={{ width: `${w}%` }} />
              </div>
            ))}
          </div>
          {/* Composer skeleton */}
          <div className="border-t border-[#e5e4e7] bg-white p-4">
            <div className="h-12 animate-pulse rounded-3xl bg-[#f1ecfb]" />
          </div>
        </div>
      </div>
    )
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div
      className="relative flex w-full overflow-hidden bg-white text-slate-900"
      style={{ height: `calc(100dvh - ${HEADER_PX}px)` }}
    >
      {/* ── Decorativos de fondo ─────────────────────────────────────────── */}
      <div className="pointer-events-none absolute left-1/3 top-10 h-64 w-64 rounded-full bg-[#9d31ff]/5 blur-3xl" />
      <div className="pointer-events-none absolute right-1/3 bottom-20 h-64 w-64 rounded-full bg-[#ff318c]/5 blur-3xl" />

      {/* ── SIDEBAR IZQUIERDO (Escritorio) ───────────────────────────────── */}
      <aside
        className={`hidden lg:flex flex-col flex-shrink-0 border-r border-[#ece8f6] bg-slate-50/60 h-full overflow-y-auto transition-all duration-300 ${
          leftOpen ? 'lg:w-64 xl:w-72' : 'lg:w-0 overflow-hidden'
        }`}
      >
        <ChatThreadList
          threads={threads}
          activeThreadId={activeThreadId}
          onSelectThread={handleSelectThread}
          onNewThread={handleNewThread}
          profileLabel={roleProfile.welcomeTitle}
          profileText={roleProfile.welcomeText}
          profileAccent={roleProfile.accent}
          isSidebar={true}
          readOnly={isReadOnlyAudit}
          userFilter={userFilterConfig}
        />
      </aside>

      {/* ── DRAWER IZQUIERDO (Móvil/Tablet) ─────────────────────────────── */}
      <div
        className={`fixed inset-y-0 left-0 z-50 flex flex-col w-[min(280px,80vw)] bg-white shadow-2xl transition-transform duration-300 ease-in-out lg:hidden ${
          leftOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{ top: `${HEADER_PX}px` }}
      >
        <ChatThreadList
          threads={threads}
          activeThreadId={activeThreadId}
          onSelectThread={handleSelectThread}
          onNewThread={handleNewThread}
          profileLabel={roleProfile.welcomeTitle}
          profileText={roleProfile.welcomeText}
          profileAccent={roleProfile.accent}
          isSidebar={true}
          readOnly={isReadOnlyAudit}
          userFilter={userFilterConfig}
        />
      </div>

      {/* ── ÁREA CENTRAL (Chat) ──────────────────────────────────────────── */}
      <section className="relative flex flex-1 min-w-0 flex-col h-full overflow-hidden bg-white">
        {/* Sub-header compacto con toggles */}
        <header className="flex h-12 flex-shrink-0 items-center justify-between border-b border-[#ece8f6] bg-white/95 px-3 backdrop-blur-sm sm:h-14 sm:px-4">
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => setLeftOpen(!leftOpen)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#ece8f6] bg-white text-slate-500 shadow-sm transition hover:bg-[#f8faff] hover:text-[#9d31ff] active:scale-95 sm:h-9 sm:w-9 sm:rounded-xl"
              title="Historial de chats"
            >
              <History className="h-4 w-4" />
            </button>
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 sm:text-xs">
              {isReadOnlyAudit ? 'Auditoría de chat' : roleProfile.label}
            </span>
          </div>

          <button
            type="button"
            onClick={() => setRightOpen(!rightOpen)}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#ece8f6] bg-white text-slate-500 shadow-sm transition hover:bg-[#f8faff] hover:text-[#9d31ff] active:scale-95 sm:h-9 sm:w-9 sm:rounded-xl"
            title="Ajustes del chat"
          >
            <Settings2 className="h-4 w-4" />
          </button>
        </header>

        {/* Banner de error */}
        {error && (
          <div className="mx-3 mt-2 flex-shrink-0 rounded-xl border border-[#ffd4e7] bg-[#fff5fb] px-3 py-2 text-xs font-medium text-[#9d31ff]">
            {error}
          </div>
        )}

        {isReadOnlyAudit && (
          <div className="mx-3 mt-2 flex-shrink-0 rounded-xl border border-[#ece8f6] bg-[#f8faff] px-3 py-2 text-xs font-medium text-slate-600">
            {role === 'teacher'
              ? 'Modo solo lectura: estás revisando el historial de un estudiante.'
              : 'Modo solo lectura: estás revisando el historial de otro usuario.'}
          </div>
        )}

        {/* ── Zona de mensajes (scroll) ────────────────────────────────── */}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-3 sm:px-4">
          <div className="space-y-2 sm:space-y-2.5">
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
              <div className="flex min-h-[45vh] flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-[#ece8f6] bg-[#fafafa] px-4 py-8 text-center">
                <div className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${roleProfile.accent} shadow-md`}>
                  <PanelRightOpen className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-800 sm:text-base">
                    {isReadOnlyAudit
                      ? role === 'teacher'
                        ? 'Historial del estudiante'
                        : 'Historial del usuario'
                      : roleProfile.welcomeTitle}
                  </h3>
                  <p className="mt-1 text-xs leading-5 text-slate-500">{emptyStateText}</p>
                </div>
              </div>
            )}
            <div ref={bottomRef} className="h-1" />
          </div>
        </div>

        {/* ── Composer fijo en la parte inferior ───────────────────────── */}
        <div className="flex-shrink-0 border-t border-[#e5e4e7] bg-white/95 backdrop-blur-sm">
          {isReadOnlyAudit ? (
            <div className="px-4 py-3 text-center text-xs text-slate-500">
              {role === 'teacher'
                ? 'No puedes enviar mensajes mientras revisas el historial de un estudiante.'
                : 'No puedes enviar mensajes mientras revisas el historial de otro usuario.'}
            </div>
          ) : (
            <ChatComposer
              onSend={handleSendMessage}
              placeholder={`Pregunta como ${roleProfile.label.toLowerCase()}...`}
              disabled={sending || !session?.access_token}
              sending={sending}
            />
          )}
        </div>
      </section>

      {/* ── SIDEBAR DERECHO (Escritorio) ─────────────────────────────────── */}
      <aside
        className={`hidden lg:flex flex-col flex-shrink-0 border-l border-[#ece8f6] bg-slate-50/60 h-full overflow-y-auto transition-all duration-300 ${
          rightOpen ? 'lg:w-64 xl:w-72' : 'lg:w-0 overflow-hidden'
        }`}
      >
        <ChatSettingsPanel
          role={role}
          settings={settings}
          onChange={handleUpdateSettings}
          onReset={() => {
            setSettings(defaultChatSettings)
            setSettingsSaved(false)
          }}
          onSave={handleSaveSettings}
          saveMessage={saveMessage}
          profileAccent={roleProfile.accent}
          disabled={isSettingsLocked}
          isSidebar={true}
        />
      </aside>

      {/* ── DRAWER DERECHO (Móvil/Tablet) ──────────────────────────────── */}
      <div
        className={`fixed inset-y-0 right-0 z-50 flex flex-col w-[min(280px,80vw)] bg-white shadow-2xl transition-transform duration-300 ease-in-out lg:hidden ${
          rightOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        style={{ top: `${HEADER_PX}px` }}
      >
        <ChatSettingsPanel
          role={role}
          settings={settings}
          onChange={handleUpdateSettings}
          onReset={() => {
            setSettings(defaultChatSettings)
            setSettingsSaved(false)
          }}
          onSave={handleSaveSettings}
          saveMessage={saveMessage}
          profileAccent={roleProfile.accent}
          disabled={isSettingsLocked}
          isSidebar={true}
        />
      </div>

      {/* ── BACKDROP (cierra drawers en móvil) ──────────────────────────── */}
      {(leftOpen || rightOpen) && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/25 backdrop-blur-[1px] lg:hidden"
          style={{ top: `${HEADER_PX}px` }}
          onClick={() => {
            if (!isDesktop()) {
              setLeftOpen(false)
              setRightOpen(false)
            }
          }}
        />
      )}
    </div>
  )
}
