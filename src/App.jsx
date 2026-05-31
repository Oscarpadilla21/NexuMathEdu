import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import Login from './components/Login'
import AdminDashboard from './pages/AdminDashboard'
import TeacherDashboard from './pages/TeacherDashboard'
import StudentDashboard from './pages/StudentDashboard'
import ProfilePage from './pages/ProfilePage'
import ChatPage from './pages/ChatPage'
import { getRouteForRole } from './utils/roleRoutes'

function AppRoutes() {
  const { role, isAuthenticated } = useAuth()

  return (
    <Routes>
      {/* Rutas publicas y privadas separadas por rol. */}
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<Navigate to={getRouteForRole(role, isAuthenticated)} replace />} />
      <Route path="/admin" element={<ProtectedRoute allowedRoles={['admin']}><AdminDashboard /></ProtectedRoute>} />
      <Route path="/teacher" element={<ProtectedRoute allowedRoles={['teacher']}><TeacherDashboard /></ProtectedRoute>} />
      <Route path="/student" element={<ProtectedRoute allowedRoles={['student']}><StudentDashboard /></ProtectedRoute>} />
      <Route path="/perfil" element={<ProtectedRoute allowedRoles={['admin', 'teacher', 'student']}><ProfilePage /></ProtectedRoute>} />
      <Route path="/chat" element={<ProtectedRoute allowedRoles={['admin', 'teacher', 'student']}><ChatPage /></ProtectedRoute>} />
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
