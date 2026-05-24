import { Sparkles, Settings2 } from 'lucide-react'
import { getChatDetailLevels, getChatToneOptions, getChatRoleProfile } from '../../utils/chatPresets'

export default function ChatSettingsPanel({
  role,
  settings,
  onChange,
  onReset,
  profileAccent = 'from-violet-500 to-fuchsia-500',
}) {
  const roleProfile = getChatRoleProfile(role)

  return (
    <section className="flex h-full flex-col rounded-3xl border border-[#e5e4e7] bg-white p-4 shadow-2xl">
      <div className="flex items-start justify-between gap-4 border-b border-[#ece8f6] pb-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-[#9d31ff]">Configuracion</p>
          <h2 className="mt-2 text-xl font-semibold text-slate-900">Ajustes del chat</h2>
          <p className="mt-1 text-sm text-slate-500">{roleProfile.label}</p>
        </div>
        <div className={`flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br ${profileAccent} shadow-lg`}>
          <Settings2 className="h-5 w-5 text-white" />
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-[#ece8f6] bg-[#f8faff] px-4 py-4 text-sm text-slate-700">
        <div className="flex items-center gap-2 font-semibold">
          <Sparkles className="h-4 w-4" />
          Perfil inteligente
        </div>
        <p className="mt-2 leading-6">{roleProfile.welcomeText}</p>
      </div>

      <div className="mt-4 space-y-4 overflow-y-auto pr-1">
        <label className="block">
          <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Tono</span>
          <select
            value={settings.tone}
            onChange={(e) => onChange({ tone: e.target.value })}
            className="w-full rounded-2xl border border-[#e5e4e7] bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[#9d31ff]/40"
          >
            {getChatToneOptions().map((tone) => (
              <option key={tone} value={tone}>
                {tone}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Nivel de detalle</span>
          <select
            value={settings.detailLevel}
            onChange={(e) => onChange({ detailLevel: e.target.value })}
            className="w-full rounded-2xl border border-[#e5e4e7] bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[#9d31ff]/40"
          >
            {getChatDetailLevels().map((level) => (
              <option key={level} value={level}>
                {level}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Enfoque</span>
          <select
            value={settings.focus}
            onChange={(e) => onChange({ focus: e.target.value })}
            className="w-full rounded-2xl border border-[#e5e4e7] bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[#9d31ff]/40"
          >
            {roleProfile.suggestedFocus.map((focus) => (
              <option key={focus} value={focus}>
                {focus}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Idioma</span>
          <select
            value={settings.language}
            onChange={(e) => onChange({ language: e.target.value })}
            className="w-full rounded-2xl border border-[#e5e4e7] bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[#9d31ff]/40"
          >
            <option value="espanol">Español</option>
            <option value="english">English</option>
          </select>
        </label>

        <div className="rounded-2xl border border-[#e5e4e7] bg-[#fafafa] px-4 py-4 text-sm leading-6 text-slate-600">
          Este panel ajusta el comportamiento del asistente sin exponer credenciales. La IA se consulta por la API y el
          historial queda centralizado en Supabase desde el servidor.
        </div>
      </div>

      <button
        type="button"
        onClick={onReset}
        className="mt-4 rounded-2xl border border-[#e5e4e7] bg-white px-4 py-3 text-sm font-semibold text-slate-800 transition hover:border-[#9d31ff]/30 hover:bg-[#f8faff]"
      >
        Restablecer ajustes
      </button>
    </section>
  )
}
