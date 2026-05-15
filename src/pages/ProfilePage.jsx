import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import DashboardHeader from '../components/layout/DashboardHeader'
import { useAuth } from '../contexts/AuthContext'

const roleLabels = {
  admin: 'Administrador',
  teacher: 'Profesor',
  student: 'Estudiante',
}

export default function ProfilePage() {
  const { profile, logout, role } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  const initials = useMemo(() => {
    const name = profile?.full_name || profile?.email || ''
    return name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('')
  }, [profile?.email, profile?.full_name])

  const roleLabel = roleLabels[role] || 'Usuario'

  return (
    <div className="min-h-screen bg-slate-50">
      <DashboardHeader
        subtitle={profile?.full_name || profile?.email}
        userLabel={roleLabel}
        navItems={[
          { label: 'Inicio', to: `/${role || 'login'}` },
          { label: 'Mi perfil', to: '/perfil' },
          { label: 'Chat', to: '/chat' },
        ]}
        onLogout={handleLogout}
        variant="gradient"
      />

      <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-900 px-6 py-8 text-white sm:px-8">
            <p className="text-sm uppercase tracking-[0.25em] text-slate-300">Mi perfil</p>
            <h1 className="mt-3 text-3xl font-semibold">Información de tu cuenta</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-300">
              Desde aquí puedes revisar los datos básicos de tu sesión y saltar rápido al chat de IA.
            </p>
          </div>

          <div className="grid gap-6 p-6 sm:p-8 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="rounded-2xl bg-slate-50 p-6">
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-900 text-xl font-bold text-white">
                  {initials || 'NA'}
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-slate-900">{profile?.full_name || 'Sin nombre'}</h2>
                  <p className="text-sm text-slate-500">{profile?.email}</p>
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
                  <dt className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">ID de usuario</dt>
                  <dd className="mt-2 break-all text-sm font-medium text-slate-700">{profile?.id || 'No disponible'}</dd>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <dt className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Desde</dt>
                  <dd className="mt-2 text-sm font-medium text-slate-700">
                    {profile?.created_at ? new Date(profile.created_at).toLocaleDateString('es-CO') : 'Sin dato'}
                  </dd>
                </div>
              </dl>
            </div>

            <aside className="space-y-4">
              <div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-5">
                <p className="text-sm font-semibold text-indigo-700">Accesos rápidos</p>
                <div className="mt-4 flex flex-col gap-3">
                  <button
                    onClick={() => navigate('/chat')}
                    className="rounded-xl bg-indigo-600 px-4 py-3 text-left text-sm font-semibold text-white transition hover:bg-indigo-700"
                  >
                    Abrir chat de IA
                  </button>
                  <button
                    onClick={() => navigate(`/${role || 'login'}`)}
                    className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-left text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    Volver al inicio
                  </button>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5">
                <p className="text-sm font-semibold text-slate-900">Nota</p>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Esta vista está separada del panel principal para que el perfil tenga su propia navegación y pueda crecer
                  más adelante con edición de datos, foto y preferencias.
                </p>
              </div>
            </aside>
          </div>
        </section>
      </main>
    </div>
  )
}
