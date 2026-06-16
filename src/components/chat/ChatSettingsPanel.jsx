import { Sparkles, Settings2, Save } from 'lucide-react'
import {
  getChatDetailLevels,
  getChatProviderOptions,
  getChatRoleProfile,
  getChatToneOptions,
  getChatTopicOptions,
  normalizeChatProvider,
} from '../../utils/chatPresets'

export default function ChatSettingsPanel({
  role,
  settings,
  onChange,
  onReset,
  onSave,
  saveMessage = '',
  disabled = false,
  profileAccent = 'from-violet-500 to-fuchsia-500',
  isSidebar = false,
}) {
  const roleProfile = getChatRoleProfile(role)
  const selectedProvider = normalizeChatProvider(settings.provider)

  return (
    <section className={`flex h-full flex-col ${isSidebar ? 'border-[#ece8f6] bg-slate-50/50 p-4' : 'rounded-3xl border border-[#e5e4e7] bg-white p-4 shadow-2xl'}`}>
      {!isSidebar && (
        <div className="flex items-start justify-between gap-4 border-b border-[#ece8f6] pb-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-[#9d31ff]">Configuración</p>
            <h2 className="mt-2 text-xl font-semibold text-slate-900">Ajustes del chat</h2>
            <p className="mt-1 text-sm text-slate-500">{roleProfile.label}</p>
          </div>
          <div className={`flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br ${profileAccent} shadow-lg`}>
            <Settings2 className="h-5 w-5 text-white" />
          </div>
        </div>
      )}

      {!isSidebar && (
        <div className="mt-4 rounded-2xl border border-[#ece8f6] bg-[#f8faff] px-4 py-4 text-sm text-slate-700">
          <div className="flex items-center gap-2 font-semibold">
            <Sparkles className="h-4 w-4" />
            Perfil del chat
          </div>
          <p className="mt-2 leading-6">{roleProfile.welcomeText}</p>
        </div>
      )}

      {disabled && (
        <div className="mt-2 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs leading-5 text-amber-900">
          Modo lectura. Ajustes bloqueados.
        </div>
      )}

      <div className="mt-4 space-y-4 overflow-y-auto pr-1">
        <label className="block">
          <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Tono</span>
          <select
            value={settings.tone}
            onChange={(e) => onChange({ tone: e.target.value })}
            disabled={disabled}
            className="w-full rounded-2xl border border-[#e5e4e7] bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[#9d31ff]/40 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {getChatToneOptions().map((tone) => (
              <option key={tone} value={tone}>
                {tone}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
            Nivel de detalle
          </span>
          <select
            value={settings.detailLevel}
            onChange={(e) => onChange({ detailLevel: e.target.value })}
            disabled={disabled}
            className="w-full rounded-2xl border border-[#e5e4e7] bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[#9d31ff]/40 disabled:cursor-not-allowed disabled:opacity-60"
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
            disabled={disabled}
            className="w-full rounded-2xl border border-[#e5e4e7] bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[#9d31ff]/40 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {roleProfile.suggestedFocus.map((focus) => (
              <option key={focus} value={focus}>
                {focus}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Tema matemático</span>
          <select
            value={settings.topic || 'general'}
            onChange={(e) => onChange({ topic: e.target.value })}
            disabled={disabled}
            className="w-full rounded-2xl border border-[#e5e4e7] bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[#9d31ff]/40 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {getChatTopicOptions().map((topicOption) => (
              <option key={topicOption.value} value={topicOption.value}>
                {topicOption.label}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Idioma</span>
          <select
            value={settings.language}
            onChange={(e) => onChange({ language: e.target.value })}
            disabled={disabled}
            className="w-full rounded-2xl border border-[#e5e4e7] bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[#9d31ff]/40 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <option value="espanol">Español</option>
            <option value="english">English</option>
          </select>
        </label>

        <label className="block">
          <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Modelo de respuesta</span>
          <select
            value={selectedProvider}
            onChange={(e) => onChange({ provider: e.target.value })}
            disabled={disabled}
            className="w-full rounded-2xl border border-[#e5e4e7] bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[#9d31ff]/40 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {getChatProviderOptions().map((provider) => (
              <option key={provider.value} value={provider.value}>
                {provider.label}
              </option>
            ))}
          </select>
        </label>

        <div className="rounded-2xl border border-[#e5e4e7] bg-[#fafafa] px-4 py-4 text-sm leading-6 text-slate-600">
          Este panel ajusta tono, detalle, enfoque, idioma y modelo de respuesta desde un solo lugar.
        </div>
      </div>

      <button
        type="button"
        onClick={onSave}
        disabled={disabled}
        className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#9d31ff] to-[#ff318c] px-4 py-3 text-sm font-semibold text-white shadow-md transition hover:brightness-110 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Save className="h-4 w-4" />
        {disabled ? 'Configuración bloqueada' : 'Guardar configuración'}
      </button>

      {saveMessage && (
        <p className="mt-1.5 text-center text-xs font-medium text-emerald-600">{saveMessage}</p>
      )}

      <button
        type="button"
        onClick={onReset}
        disabled={disabled}
        className="mt-2 rounded-2xl border border-[#e5e4e7] bg-white px-4 py-3 text-sm font-semibold text-slate-800 transition hover:border-[#9d31ff]/30 hover:bg-[#f8faff] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {disabled ? 'Configuración bloqueada' : 'Restablecer ajustes'}
      </button>
    </section>
  )
}
