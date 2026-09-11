import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import ProtectedLayout from './components/layout/ProtectedLayout'
import Login from './components/Login'
import ErrorBoundary from './components/ErrorBoundary'
import { getRouteForRole } from './utils/roleRoutes'

const AdminDashboard = lazy(() => import('./pages/AdminDashboard'))
const TeacherDashboard = lazy(() => import('./pages/TeacherDashboard'))
const StudentDashboard = lazy(() => import('./pages/StudentDashboard'))
const ProfilePage = lazy(() => import('./pages/ProfilePage'))
const ChatPage = lazy(() => import('./pages/ChatPage'))

function PageFallback() {
  return (
    <div className="flex h-64 w-full items-center justify-center p-8">
      <div className="text-center">
        <div className="mb-3 inline-block h-7 w-7 animate-spin rounded-full border-3 border-slate-200 border-t-[#9d31ff]"></div>
        <p className="text-xs font-semibold text-slate-500">Cargando módulo...</p>
      </div>
    </div>
  )
}

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
    <Suspense fallback={<PageFallback />}>
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
    </Suspense>
  )
}

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </ErrorBoundary>
  )
}

export default App
