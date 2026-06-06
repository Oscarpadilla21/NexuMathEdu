import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import ProtectedLayout from './components/layout/ProtectedLayout'
import Login from './components/Login'
import AdminDashboard from './pages/AdminDashboard'
import TeacherDashboard from './pages/TeacherDashboard'
import StudentDashboard from './pages/StudentDashboard'
import ProfilePage from './pages/ProfilePage'
import ChatPage from './pages/ChatPage'
import { getRouteForRole } from './utils/roleRoutes'

function AppRoutes() {
  const { role, isAuthenticated, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="mb-4 inline-block h-8 w-8 animate-spin rounded-full border-4 border-slate-300 border-t-[#9d31ff]"></div>
          <p className="text-slate-600">Cargando...</p>
        </div>
      </div>
    )
  }

  return (
    <Routes>
      {/* Rutas publicas y privadas separadas por rol. */}
      <Route path="/login" element={<Login />} />
      <Route path="/" element={isAuthenticated ? <Navigate to={getRouteForRole(role, isAuthenticated)} replace /> : <Navigate to="/login" replace />} />
      <Route element={<ProtectedLayout />}>
        <Route path="/admin" element={<ProtectedRoute allowedRoles={['admin']}><AdminDashboard /></ProtectedRoute>} />
        <Route path="/teacher" element={<ProtectedRoute allowedRoles={['teacher']}><TeacherDashboard /></ProtectedRoute>} />
        <Route path="/student" element={<ProtectedRoute allowedRoles={['student']}><StudentDashboard /></ProtectedRoute>} />
        <Route path="/perfil" element={<ProtectedRoute allowedRoles={['admin', 'teacher', 'student']}><ProfilePage /></ProtectedRoute>} />
        <Route path="/chat" element={<ProtectedRoute allowedRoles={['admin', 'teacher', 'student']}><ChatPage /></ProtectedRoute>} />
      </Route>
      <Route path="*" element={<Navigate to={getRouteForRole(role, isAuthenticated)} replace />} />
    </Routes>
  )
}

function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  )
}

export default App
