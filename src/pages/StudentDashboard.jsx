import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import DashboardHeader from '../components/layout/DashboardHeader'

export default function StudentDashboard() {
  const { profile, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <div className="flex min-h-screen w-full flex-col bg-gray-100">
      <DashboardHeader
        subtitle={profile?.full_name}
        userLabel="Estudiante"
        navItems={[
          { label: 'Home', to: '/student' },
          { label: 'Mi perfil', to: '/perfil' },
          { label: 'Chat', to: '/chat' },
        ]}
        onLogout={handleLogout}
        variant="gradient"
      />

      <main className="w-full flex-1 px-4 py-8 sm:px-6 lg:px-8">
        <section className="mb-6 bg-white rounded-lg shadow p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold">Accesos rápidos</h2>
              <p className="text-sm text-gray-500">
                Tu perfil y el chat de IA ya cuentan con pantallas separadas para una experiencia más clara.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => navigate('/perfil')}
                className="rounded-lg border border-purple-200 bg-purple-50 px-4 py-2 text-sm font-semibold text-purple-700 hover:bg-purple-100"
              >
                Abrir mi perfil
              </button>
              <button
                onClick={() => navigate('/chat')}
                className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-700"
              >
                Ir al chat IA
              </button>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div id="notas" className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">Mis notas</h2>
            <div className="space-y-2">
              <div className="flex justify-between border-b py-2">
                <span>Matemáticas - Ecuaciones</span>
                <span className="font-bold text-green-600">4.5</span>
              </div>
              <div className="flex justify-between border-b py-2">
                <span>Geometría - Áreas</span>
                <span className="font-bold text-yellow-600">3.8</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">Chat IA</h2>
            <p className="text-gray-600 mb-4">Practica matemáticas con nuestro asistente inteligente.</p>
            <button
              onClick={() => navigate('/chat')}
              className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"
            >
              Ir al chat
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}
