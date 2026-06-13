import { Outlet, useLocation } from 'react-router-dom'
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
  const { pathname } = useLocation()
  const isChat = pathname === '/chat'

  const navItems = navItemsByRole[role] || [
    { label: 'Inicio', to: '/' },
    { label: 'Mi perfil', to: '/perfil' },
    { label: 'Chat', to: '/chat' },
  ]

  return (
    <div className="flex flex-col min-h-screen w-full bg-[#f8faff] text-slate-900">
      <DashboardHeader
        subtitle={profile?.full_name || profile?.email}
        userName={profile?.full_name || profile?.email}
        userLabel={roleLabel[role] || 'Usuario'}
        navItems={navItems}
        onLogout={logout}
        variant="gradient"
        showSubtitle={false}
      />
      <main className={`flex w-full flex-1 flex-col ${isChat ? 'p-0 overflow-hidden' : 'px-4 py-6 sm:px-6 lg:px-8'}`} style={isChat ? { height: 'calc(100dvh - 64px)' } : undefined}>
        <Outlet />
      </main>
    </div>
  )
}
