import { useMemo, useState, useEffect } from 'react'
import { Eye, EyeOff, Shield } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

const roleLabels = {
  admin: 'Administrador',
  teacher: 'Profesor',
  student: 'Estudiante',
}

export default function ProfilePage() {
  const { profile, user, role, login, updatePassword, isAuthenticated } = useAuth()
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

  // Si la sesión se cierra, redirigimos automáticamente.
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login', { replace: true })
    }
  }, [isAuthenticated, navigate])

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

  return (
    <div className="w-full min-h-[calc(100svh-64px)] bg-slate-50 p-4 flex flex-col">
      {/* Grid de contenido de 2 columnas en desktop, 1 columna en móvil */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
        {/* Columna 1: Mi Cuenta */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-900 text-sm font-bold text-white shadow-sm shrink-0">
                {initials || 'NA'}
              </div>
              <div className="min-w-0">
                <h2 className="text-base font-bold text-slate-900 leading-tight truncate">{resolvedName}</h2>
                <p className="text-xs text-slate-500 truncate">{resolvedEmail}</p>
              </div>
            </div>

            <dl className="mt-4 space-y-3">
              <div className="rounded-lg border border-slate-100 bg-slate-50/20 p-3 flex items-center justify-between">
                <dt className="text-xs font-bold uppercase tracking-wider text-slate-400">Rol</dt>
                <dd className="text-sm font-semibold text-slate-800">{roleLabel}</dd>
              </div>
              <div className="rounded-lg border border-slate-100 bg-slate-50/20 p-3 flex items-center justify-between">
                <dt className="text-xs font-bold uppercase tracking-wider text-slate-400">Estado</dt>
                <dd className="text-sm font-semibold text-emerald-600">Activo</dd>
              </div>
              <div className="rounded-lg border border-slate-100 bg-slate-50/20 p-3 flex flex-col gap-1">
                <dt className="text-xs font-bold uppercase tracking-wider text-slate-400">ID único</dt>
                <dd className="break-all text-xs font-mono text-slate-500 select-all leading-normal">{profile?.id || user?.id || 'No disponible'}</dd>
              </div>
              <div className="rounded-lg border border-slate-100 bg-slate-50/20 p-3 flex items-center justify-between">
                <dt className="text-xs font-bold uppercase tracking-wider text-slate-400">Miembro desde</dt>
                <dd className="text-xs font-semibold text-slate-700">
                  {profile?.created_at || user?.created_at
                    ? new Date(profile?.created_at || user?.created_at).toLocaleDateString('es-CO', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })
                    : 'Sin dato'}
                </dd>
              </div>
            </dl>
          </div>
        </div>

        {/* Columna 2: Seguridad / Cambiar Contraseña */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3 mb-4">
              <Shield size={16} className="text-indigo-600" />
              <h3 className="text-sm font-bold text-slate-900">Cambiar contraseña</h3>
            </div>

            <form className="space-y-3" onSubmit={handlePasswordChange}>
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Contraseña actual</label>
                <div className="relative mt-1">
                  <input
                    type={showCurrentPassword ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 pr-10 text-sm text-slate-800 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                    placeholder="Tu contraseña actual"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword((prev) => !prev)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer flex items-center justify-center"
                  >
                    {showCurrentPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Nueva contraseña</label>
                <div className="relative mt-1">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 pr-10 text-sm text-slate-800 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                    placeholder="Mínimo 8 caracteres"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword((prev) => !prev)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer flex items-center justify-center"
                  >
                    {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Confirmar nueva contraseña</label>
                <div className="relative mt-1">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 pr-10 text-sm text-slate-800 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                    placeholder="Confirma la nueva contraseña"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer flex items-center justify-center"
                  >
                    {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {statusMessage && (
                <p className={`text-xs font-semibold leading-tight ${statusType === 'success' ? 'text-emerald-700' : 'text-rose-600'}`}>
                  {statusMessage}
                </p>
              )}

              <button
                type="submit"
                disabled={isChangingPassword}
                className="w-full rounded-lg bg-indigo-600 py-2.5 text-xs font-semibold text-white transition hover:bg-indigo-700 active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-slate-300 shadow-sm mt-2 cursor-pointer"
              >
                {isChangingPassword ? 'Actualizando...' : 'Guardar contraseña'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
