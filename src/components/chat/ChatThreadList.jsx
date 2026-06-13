import { Plus, History } from 'lucide-react'
import { formatThreadLabel } from '../../utils/chatPresets'

export default function ChatThreadList({
  threads = [],
  activeThreadId,
  onSelectThread,
  onNewThread,
  profileLabel,
  profileText,
  profileAccent = 'from-violet-500 to-fuchsia-500',
  isSidebar = false,
}) {
  return (
    <section className={`flex h-full flex-col ${isSidebar ? 'border-[#ece8f6] bg-slate-50/50 p-4' : 'rounded-3xl border border-[#e5e4e7] bg-white p-4 shadow-2xl'}`}>
      {/* Cabecera: contexto del usuario y titulo de la vista. */}
      {!isSidebar && (
        <div className="flex items-start justify-between gap-4 border-b border-[#ece8f6] pb-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-[#9d31ff]">Historial</p>
            <h2 className="mt-2 text-xl font-semibold text-slate-900">Conversaciones</h2>
            <p className="mt-1 text-sm text-slate-500">{profileLabel}</p>
          </div>
          <div className={`flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br ${profileAccent} shadow-lg`}>
            <History className="h-5 w-5 text-white" />
          </div>
        </div>
      )}

      {/* Texto descriptivo del perfil o rol activo. */}
      {!isSidebar && profileText && (
        <p className="mt-4 rounded-2xl border border-[#ece8f6] bg-[#f8faff] px-4 py-3 text-sm leading-6 text-slate-700">
          {profileText}
        </p>
      )}

      <button
        type="button"
        onClick={onNewThread}
        className={`mt-2 inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold transition-all ${
          isSidebar
            ? 'bg-gradient-to-r from-[#9d31ff] to-[#ff318c] text-white shadow-md hover:brightness-110 hover:shadow-lg'
            : 'border border-[#9d31ff]/15 bg-[#f8faff] text-[#9d31ff] hover:border-[#9d31ff]/30 hover:bg-[#fff5fb]'
        }`}
      >
        <Plus className="h-4 w-4" />
        Nuevo chat
      </button>

      {/* Lista de conversaciones; la actual queda resaltada. */}
      <div className="mt-4 flex-1 space-y-2 overflow-y-auto pr-1">
        {threads.length > 0 ? (
          threads.map((thread) => {
            const isActive = thread.id === activeThreadId

            return (
              <button
                key={thread.id}
                type="button"
                onClick={() => onSelectThread(thread.id)}
                className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                  isActive
                    ? 'border-[#9d31ff]/25 bg-[#f8faff] text-slate-900'
                    : 'border-[#ece8f6] bg-white text-slate-700 hover:bg-[#f8faff] hover:text-slate-900'
                }`}
              >
                <div className="text-sm font-semibold">{formatThreadLabel(thread)}</div>
                <div className="mt-1 text-[11px] uppercase tracking-[0.18em] text-slate-400">
                  {thread.updated_at ? new Date(thread.updated_at).toLocaleDateString('es-CO') : 'Sin fecha'}
                </div>
              </button>
            )
          })
        ) : (
          // Estado vacio cuando todavia no existe ningun hilo guardado.
          <div className="rounded-2xl border border-dashed border-[#e5e4e7] bg-[#fafafa] px-4 py-5 text-sm text-slate-500">
            Todavia no hay conversaciones guardadas.
          </div>
        )}
      </div>
    </section>
  )
}
