import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import DashboardHeader from '../components/layout/DashboardHeader'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

const demoThreads = [
  {
    id: 'student-1',
    name: 'Ana García',
    role: 'student',
    lastMessage: 'Necesito ayuda con ecuaciones lineales.',
    messages: [
      { id: 'm1', sender: 'student', content: 'Hola, ¿me ayudas con ecuaciones lineales?' },
      { id: 'm2', sender: 'assistant', content: 'Claro. Empecemos despejando la variable paso a paso.' },
    ],
  },
  {
    id: 'teacher-1',
    name: 'Carlos Ruiz',
    role: 'teacher',
    lastMessage: 'Quiero generar una actividad para geometría.',
    messages: [
      { id: 'm1', sender: 'teacher', content: 'Necesito una actividad rápida de geometría para 8°.' },
      { id: 'm2', sender: 'assistant', content: 'Te propongo 3 ejercicios con figuras y áreas para resolver en clase.' },
    ],
  },
]

const makeAssistantReply = (text) =>
  `Te ayudo con eso. ${text?.trim() ? 'Revisemos tu idea y la resolvemos paso a paso.' : '¿Qué parte te gustaría que trabajemos primero?'}`

export default function ChatPage() {
  const { profile, logout, role } = useAuth()
  const navigate = useNavigate()
  const isAdmin = role === 'admin'
  const [threads, setThreads] = useState(demoThreads)
  const [selectedThreadId, setSelectedThreadId] = useState(demoThreads[0]?.id || null)
  const [draft, setDraft] = useState('')
  const [loading, setLoading] = useState(true)

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  useEffect(() => {
    let active = true

    const loadThreads = async () => {
      if (!profile?.id) {
        setLoading(false)
        return
      }

      try {
        if (isAdmin) {
          const { data } = await supabase
            .from('profiles')
            .select('id, full_name, email, role, created_at')
            .in('role', ['teacher', 'student'])
            .order('created_at', { ascending: false })

          if (!active) return

          const mappedThreads = (data || []).map((item, index) => ({
            id: item.id,
            name: item.full_name || item.email || `Usuario ${index + 1}`,
            role: item.role,
            lastMessage: item.role === 'teacher'
              ? 'Consulta pedagógica con la IA.'
              : 'Sesión de práctica con la IA.',
            messages: [
              {
                id: `${item.id}-1`,
                sender: item.role,
                content: `Hola IA, soy ${item.full_name || item.email}.`,
              },
              {
                id: `${item.id}-2`,
                sender: 'assistant',
                content: item.role === 'teacher'
                  ? 'Aquí tienes una propuesta didáctica con objetivos, ejemplos y una actividad breve.'
                  : 'Vamos a resolverlo juntos, con ejemplos cortos y claros.',
              },
            ],
          }))

          setThreads(mappedThreads.length > 0 ? mappedThreads : demoThreads)
          setSelectedThreadId((current) => current || mappedThreads[0]?.id || demoThreads[0]?.id || null)
        } else {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('id, full_name, email, role')
            .eq('id', profile.id)
            .maybeSingle()

          if (!active) return

          const ownerName = profileData?.full_name || profileData?.email || profile.full_name || profile.email

          setThreads([
            {
              id: profile.id,
              name: `Chat IA de ${ownerName}`,
              role,
              lastMessage: 'Escribe tu duda para recibir ayuda.',
              messages: [
                { id: 'welcome-1', sender: 'assistant', content: `Hola ${ownerName}. Soy tu asistente de matemáticas.` },
                { id: 'welcome-2', sender: role, content: 'Quiero practicar un tema de matemáticas.' },
                { id: 'welcome-3', sender: 'assistant', content: 'Perfecto. Dime el tema y lo trabajamos paso a paso.' },
              ],
            },
          ])
          setSelectedThreadId(profile.id)
        }
      } catch (error) {
        console.warn('No se pudieron cargar los chats, usando demo local.', error)
        if (active) {
          setThreads(demoThreads)
          setSelectedThreadId(demoThreads[0]?.id || null)
        }
      } finally {
        if (active) setLoading(false)
      }
    }

    void loadThreads()

    return () => {
      active = false
    }
  }, [isAdmin, profile?.email, profile?.full_name, profile?.id, role])

  const activeThread = useMemo(
    () => threads.find((thread) => thread.id === selectedThreadId) || threads[0] || null,
    [selectedThreadId, threads]
  )

  const handleSendMessage = (event) => {
    event.preventDefault()
    if (!draft.trim() || isAdmin || !activeThread) return

    const nextUserMessage = { id: `${Date.now()}-user`, sender: role, content: draft.trim() }
    const nextAssistantMessage = {
      id: `${Date.now()}-assistant`,
      sender: 'assistant',
      content: makeAssistantReply(draft),
    }

    setThreads((current) =>
      current.map((thread) =>
        thread.id === activeThread.id
          ? { ...thread, messages: [...thread.messages, nextUserMessage, nextAssistantMessage], lastMessage: nextAssistantMessage.content }
          : thread
      )
    )
    setDraft('')
  }

  if (loading) {
    return <div className="flex h-screen items-center justify-center">Cargando...</div>
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <DashboardHeader
        subtitle={profile?.full_name || profile?.email}
        userLabel={isAdmin ? 'Administrador' : role === 'teacher' ? 'Profesor' : 'Estudiante'}
        navItems={[
          { label: 'Inicio', to: `/${role || 'login'}` },
          { label: 'Mi perfil', to: '/perfil' },
          { label: 'Chat', to: '/chat' },
        ]}
        onLogout={handleLogout}
        variant="gradient"
      />

      <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
        <section className="rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-6 py-6 sm:px-8">
            <p className="text-sm uppercase tracking-[0.25em] text-slate-500">Chat IA</p>
            <h1 className="mt-2 text-3xl font-semibold text-slate-900">
              {isAdmin ? 'Supervisión de conversaciones' : 'Tu espacio de práctica'}
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              {isAdmin
                ? 'El administrador puede consultar los chats de estudiantes y profesores con la IA, sin intervenir en la conversación.'
                : 'Aquí puedes practicar con la IA. La vista de perfil y la de chat ya están separadas del panel principal.'}
            </p>
          </div>

          <div className="grid gap-0 lg:grid-cols-[320px_1fr]">
            <aside className="border-b border-slate-200 bg-slate-50 lg:border-b-0 lg:border-r">
              <div className="border-b border-slate-200 px-5 py-4">
                <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
                  {isAdmin ? 'Conversaciones' : 'Mi conversación'}
                </h2>
              </div>

              <div className="max-h-[520px] overflow-y-auto p-3">
                {threads.map((thread) => (
                  <button
                    key={thread.id}
                    onClick={() => setSelectedThreadId(thread.id)}
                    className={`mb-2 w-full rounded-2xl border px-4 py-4 text-left transition ${
                      thread.id === activeThread?.id
                        ? 'border-indigo-300 bg-indigo-50'
                        : 'border-transparent bg-white hover:border-slate-200 hover:bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{thread.name}</p>
                        <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{thread.role}</p>
                      </div>
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
                        IA
                      </span>
                    </div>
                    <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-600">{thread.lastMessage}</p>
                  </button>
                ))}
              </div>
            </aside>

            <section className="flex min-h-[520px] flex-col">
              <div className="border-b border-slate-200 px-5 py-4 sm:px-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900">{activeThread?.name || 'Chat IA'}</h2>
                    <p className="text-sm text-slate-500">
                      {isAdmin ? 'Solo lectura para administración' : 'Respuestas automáticas activas'}
                    </p>
                  </div>
                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                    Conectado a IA
                  </span>
                </div>
              </div>

              <div className="flex-1 space-y-4 overflow-y-auto bg-white px-5 py-6 sm:px-6">
                {activeThread?.messages?.map((message) => {
                  const isAssistant = message.sender === 'assistant'
                  const isMine = message.sender === role

                  return (
                    <div
                      key={message.id}
                      className={`flex ${isAssistant ? 'justify-start' : isMine ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-6 shadow-sm ${
                          isAssistant
                            ? 'bg-slate-100 text-slate-700'
                            : isMine
                              ? 'bg-indigo-600 text-white'
                              : 'bg-amber-50 text-amber-900'
                        }`}
                      >
                        {message.content}
                      </div>
                    </div>
                  )
                })}
              </div>

              <div className="border-t border-slate-200 bg-slate-50 px-5 py-4 sm:px-6">
                {isAdmin ? (
                  <p className="text-sm text-slate-500">
                    Esta vista es de consulta únicamente para el administrador.
                  </p>
                ) : (
                  <form onSubmit={handleSendMessage} className="flex gap-3">
                    <input
                      type="text"
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      placeholder="Escribe tu pregunta de matemáticas..."
                      className="min-w-0 flex-1 rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-indigo-500"
                    />
                    <button
                      type="submit"
                      className="rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700"
                    >
                      Enviar
                    </button>
                  </form>
                )}
              </div>
            </section>
          </div>
        </section>
      </main>
    </div>
  )
}
