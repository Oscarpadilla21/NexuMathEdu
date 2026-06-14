import { useMemo, useState, useEffect } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { getChatProviderLabel, getChatProviderOptions, normalizeChatProvider } from '../utils/chatPresets'

const roleLabels = {
  admin: 'Administrador',
  teacher: 'Profesor',
  student: 'Estudiante',
}

export default function ProfilePage() {
  const { profile, user, logout, role, login, updatePassword, refreshProfile, isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [statusMessage, setStatusMessage] = useState(null)
  const [statusType, setStatusType] = useState('')
  const [isChangingPassword, setIsChangingPassword] = useState(false)
  const [isSavingChatProvider, setIsSavingChatProvider] = useState(false)

  // Si la sesión se cierra, redirigimos automáticamente.
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login', { replace: true })
    }
  }, [isAuthenticated, navigate])

  // Cerramos sesion sin redirigir manualmente.
  const handleLogout = async () => {
    await logout()
  }

  const handlePasswordChange = async (event) => {
    event.preventDefault()
    setStatusMessage(null)
    setStatusType('')

    if (!currentPassword || !newPassword || !confirmPassword) {
      setStatusMessage('Por favor completa todos los campos.')
      setStatusType('error')
      return
    }

    if (newPassword.length < 8) {
      setStatusMessage('La nueva contraseña debe tener al menos 8 caracteres.')
      setStatusType('error')
      return
    }

    if (newPassword !== confirmPassword) {
      setStatusMessage('Las contraseñas no coinciden.')
      setStatusType('error')
      return
    }

    try {
      setIsChangingPassword(true)

      if (!profile?.email) {
        throw new Error('No se encontró el correo del usuario para verificar la sesión.')
      }

      await login(profile.email, currentPassword)
      await updatePassword(newPassword)

      setStatusMessage('Contraseña actualizada correctamente.')
      setStatusType('success')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (error) {
      console.error('Password update failed', error)
      setStatusMessage(
        error?.message || 'No se pudo actualizar la contraseña. Intenta de nuevo más tarde.'
      )
      setStatusType('error')
    } finally {
      setIsChangingPassword(false)
    }
  }

  // Mostramos iniciales a partir del nombre o correo para tener un avatar simple.
  const initials = useMemo(() => {
    const name = profile?.full_name || profile?.email || user?.user_metadata?.full_name || user?.email || ''
    return name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('')
  }, [profile?.email, profile?.full_name, user?.email, user?.user_metadata?.full_name])

  const resolvedEmail = profile?.email || user?.email || 'Sin correo'
  const resolvedName = profile?.full_name || user?.user_metadata?.full_name || resolvedEmail
  const resolvedRole = role || user?.user_metadata?.role || user?.app_metadata?.role || null
  const roleLabel = roleLabels[resolvedRole] || 'Usuario'
  const selectedChatProvider = normalizeChatProvider(profile?.chat_provider)

  const handleChatProviderChange = async (provider) => {
    if (!profile?.id) return

    setIsSavingChatProvider(true)
    setStatusMessage(null)
    setStatusType('')

    try {
      const { error } = await supabase.from('profiles').update({ chat_provider: provider }).eq('id', profile.id)

      if (error) {
        throw error
      }

      await refreshProfile()
      setStatusMessage(`Modelo de respuesta actualizado a ${getChatProviderLabel(provider)}.`)
      setStatusType('success')
    } catch (error) {
      console.error('Chat provider update failed', error)
      setStatusMessage(error?.message || 'No se pudo guardar la configuración del chat.')
      setStatusType('error')
    } finally {
      setIsSavingChatProvider(false)
    }
  }

  return (
    <div className="min-h-[calc(100svh-64px)] bg-slate-50">
      {/* Vista de detalle del perfil y accesos rapidos al resto de la app. */}
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-900 px-6 py-8 text-white sm:px-8">
            <p className="text-sm uppercase tracking-[0.25em] text-slate-300">Mi perfil</p>
            <h1 className="mt-3 text-3xl font-semibold">Información de tu cuenta</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-300">
              Desde aquí puedes revisar los datos básicos de tu sesión y acceder rápidamente al chat.
            </p>
          </div>

          <div className="grid gap-6 p-6 sm:p-8 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="rounded-2xl bg-slate-50 p-6">
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-900 text-xl font-bold text-white">
                  {initials || 'NA'}
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-slate-900">{resolvedName}</h2>
                  <p className="text-sm text-slate-500">{resolvedEmail}</p>
                </div>
              </div>

              <dl className="mt-6 grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <dt className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Rol</dt>
                  <dd className="mt-2 text-lg font-semibold text-slate-900">{roleLabel}</dd>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <dt className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Estado</dt>
                  <dd className="mt-2 text-lg font-semibold text-emerald-600">Activo</dd>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <dt className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Identificador</dt>
                  <dd className="mt-2 break-all text-sm font-medium text-slate-700">{profile?.id || user?.id || 'No disponible'}</dd>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <dt className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Desde</dt>
                  <dd className="mt-2 text-sm font-medium text-slate-700">
                    {profile?.created_at || user?.created_at
                      ? new Date(profile?.created_at || user?.created_at).toLocaleDateString('es-CO')
                      : 'Sin dato'}
                  </dd>
                </div>
              </dl>
            </div>

            {/* Acciones secundarias y una nota descriptiva. */}
            <aside className="space-y-4">
              <div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-5">
                <p className="text-sm font-semibold text-indigo-700">Accesos rápidos</p>
                <div className="mt-4 flex flex-col gap-3">
                  <button
                    onClick={() => navigate('/chat')}
                    className="rounded-xl bg-indigo-600 px-4 py-3 text-left text-sm font-semibold text-white transition hover:bg-indigo-700"
                  >
                    Abrir chat
                  </button>
                  <button
                    onClick={() => navigate(`/${resolvedRole || 'login'}`)}
                    className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-left text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    Volver al inicio
                  </button>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Cambiar contraseña</p>
                    <p className="mt-1 text-sm text-slate-500">
                      Actualiza tu contraseña para mantener segura tu cuenta.
                    </p>
                  </div>
                </div>

                <form className="mt-5 space-y-4" onSubmit={handlePasswordChange}>
                  <div className="relative">
                    <label className="text-sm font-medium text-slate-700">Contraseña actual</label>
                    <input
                      type={showCurrentPassword ? 'text' : 'password'}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 pr-12 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                      placeholder="Ingresa tu contraseña actual"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword((prev) => !prev)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-900"
                      aria-label={showCurrentPassword ? 'Ocultar contraseña actual' : 'Mostrar contraseña actual'}
                    >
                      {showCurrentPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>

                  <div className="relative">
                    <label className="text-sm font-medium text-slate-700">Nueva contraseña</label>
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 pr-12 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                      placeholder="Ingresa tu nueva contraseña"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword((prev) => !prev)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-900"
                      aria-label={showNewPassword ? 'Ocultar nueva contraseña' : 'Mostrar nueva contraseña'}
                    >
                      {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>

                  <div className="relative">
                    <label className="text-sm font-medium text-slate-700">Confirmar nueva contraseña</label>
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 pr-12 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                      placeholder="Repite tu nueva contraseña"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword((prev) => !prev)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-900"
                      aria-label={showConfirmPassword ? 'Ocultar confirmación de contraseña' : 'Mostrar confirmación de contraseña'}
                    >
                      {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>

                  {statusMessage && (
                    <p className={`text-sm ${statusType === 'success' ? 'text-emerald-700' : 'text-rose-600'}`}>
                      {statusMessage}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={isChangingPassword}
                    className="inline-flex w-full items-center justify-center rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                  >
                    {isChangingPassword ? 'Actualizando...' : 'Guardar contraseña'}
                  </button>
                </form>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Configuración del chat</p>
                    <p className="mt-1 text-sm text-slate-500">
                      Elige con qué modelo se responderá tu chat.
                    </p>
                  </div>
                </div>

                <div className="mt-5 space-y-3">
                  <label className="block">
                    <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                      Modelo de respuesta
                    </span>
                    <select
                      value={selectedChatProvider}
                      onChange={(e) => void handleChatProviderChange(e.target.value)}
                      disabled={isSavingChatProvider}
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      {getChatProviderOptions().map((provider) => (
                        <option key={provider.value} value={provider.value}>
                          {provider.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <p className="text-sm leading-6 text-slate-600">
                    {selectedChatProvider === 'profesor_2'
                      ? 'Estás usando Profesor 2 para las respuestas del chat.'
                      : 'Estás usando Profesor 1 para las respuestas del chat.'}
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5">
                <p className="text-sm font-semibold text-slate-900">Nota</p>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Aquí puedes gestionar tu contraseña, el modelo de respuesta del chat y volver al panel principal cuando lo necesites.
                </p>
              </div>
            </aside>
          </div>
        </section>
      </main>
    </div>
  )
}
