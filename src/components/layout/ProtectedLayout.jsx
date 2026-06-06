import { Outlet } from 'react-router-dom'
import DashboardHeader from './DashboardHeader'
import { useAuth } from '../../contexts/AuthContext'

const navItemsByRole = {
  admin: [
    { label: 'Inicio', to: '/admin' },
    { label: 'Mi perfil', to: '/perfil' },
    { label: 'Chat', to: '/chat' },
  ],
  teacher: [
    { label: 'Inicio', to: '/teacher' },
    { label: 'Mi perfil', to: '/perfil' },
    { label: 'Chat', to: '/chat' },
  ],
  student: [
    { label: 'Inicio', to: '/student' },
    { label: 'Mi perfil', to: '/perfil' },
    { label: 'Chat', to: '/chat' },
  ],
}

const roleLabel = {
  admin: 'Administrador',
  teacher: 'Profesor',
  student: 'Estudiante',
}

export default function ProtectedLayout() {
  const { profile, role, logout } = useAuth()
  const navItems = navItemsByRole[role] || [
    { label: 'Inicio', to: '/' },
    { label: 'Mi perfil', to: '/perfil' },
    { label: 'Chat', to: '/chat' },
  ]

  return (
    <div className="min-h-screen w-full bg-[#f8faff] text-slate-900">
      <DashboardHeader
        subtitle={profile?.full_name || profile?.email}
        userLabel={roleLabel[role] || 'Usuario'}
        navItems={navItems}
        onLogout={logout}
        variant="gradient"
        showSubtitle={false}
      />
      <main className="flex w-full flex-1 flex-col px-4 py-6 sm:px-6 lg:px-8">
        <Outlet />
      </main>
    </div>
  )
}
