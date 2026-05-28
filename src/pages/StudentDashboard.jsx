import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BookOpen, GraduationCap, RefreshCw, TrendingUp } from 'lucide-react'
import DashboardHeader from '../components/layout/DashboardHeader'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { calculateFinalGrade } from '../utils/grades'

async function loadStudentDashboardData({
  accessToken,
  setCourses,
  setEnrollments,
  setLoading,
  setError,
  clearError = true,
}) {
  if (!accessToken) {
    setLoading(false)
    return
  }

  setLoading(true)
  if (clearError) {
    setError('')
  }

  try {
    const { data, error: functionError } = await supabase.functions.invoke('student-dashboard-data', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })

    if (functionError) {
      console.error('Function error:', functionError)
      setCourses([])
      setEnrollments([])
      return
    }

    if (data?.error) {
      console.warn('Function returned error:', data.error)
      setCourses([])
      setEnrollments([])
      return
    }

    setCourses(data?.courses || [])
    setEnrollments(data?.enrollments || [])
  } catch (fetchError) {
    console.error('Fetch error:', fetchError)
    setCourses([])
    setEnrollments([])
    setError(fetchError?.message || 'No se pudo cargar tus notas.')
  } finally {
    setLoading(false)
  }
}

export default function StudentDashboard() {
  const { profile, session, logout, isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const [courses, setCourses] = useState([])
  const [enrollments, setEnrollments] = useState([])
  const [initialLoading, setInitialLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')

  // Si la sesión se cierra, redirigimos automáticamente.
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login', { replace: true })
    }
  }, [isAuthenticated, navigate])


  const navItems = [
    { label: 'Home', to: '/student' },
    { label: 'Mi perfil', to: '/perfil' },
    { label: 'Chat', to: '/chat' },
  ]

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadStudentDashboardData({
        accessToken: session?.access_token,
        setCourses,
        setEnrollments,
        setLoading: setInitialLoading,
        setError,
      })
    }, 0)

    return () => window.clearTimeout(timer)
  }, [session?.access_token])

  const handleLogout = async () => {
    await logout()
  }

  const refreshData = async () => {
    setRefreshing(true)
    await loadStudentDashboardData({
      accessToken: session?.access_token,
      setCourses,
      setEnrollments,
      setLoading: setRefreshing,
      setError,
      clearError: false,
    })
    setRefreshing(false)
  }

  const stats = useMemo(() => {
    const averagePf =
      enrollments.length > 0
        ? enrollments.reduce((sum, enrollment) => sum + Number(enrollment.final_grade || 0), 0) / enrollments.length
        : 0

    return {
      courses: courses.length,
      enrollments: enrollments.length,
      averagePf,
    }
  }, [courses, enrollments])

  const sortedEnrollments = useMemo(() => {
    return [...enrollments].sort((a, b) => (a.course_title || '').localeCompare(b.course_title || ''))
  }, [enrollments])

  if (initialLoading) {
    return (
      <div className="flex min-h-screen w-full flex-col bg-gray-100">
        <DashboardHeader
          subtitle={profile?.full_name || profile?.email}
          userLabel="Estudiante"
          navItems={navItems}
          onLogout={handleLogout}
          variant="gradient"
          showSubtitle={false}
        />
        <div className="flex min-h-[70svh] items-center justify-center px-4">
          <div className="rounded-3xl border border-[#ece8f6] bg-white px-6 py-5 text-sm text-slate-600 shadow-2xl">
            Cargando tus notas...
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen w-full flex-col bg-gray-100">
      <DashboardHeader
        subtitle={profile?.full_name || profile?.email}
        userLabel="Estudiante"
        navItems={navItems}
        onLogout={handleLogout}
        variant="gradient"
        showSubtitle={false}
      />

      <main className="flex w-full flex-1 flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <section className="overflow-hidden rounded-[2rem] border border-[#ece8f6] bg-white shadow-2xl">
          <div className="flex flex-col gap-4 border-b border-[#ece8f6] px-5 py-5 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-[#9d31ff]">Estudiante</p>
              <h1 className="mt-2 text-3xl font-semibold text-slate-900">Mi tablero</h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                Aquí puedes revisar tus cursos y ver tus notas P1, P2, P3 y PF calculado automáticamente.
              </p>
            </div>
            <button
              type="button"
              onClick={refreshData}
              disabled={refreshing}
              className="inline-flex items-center gap-2 rounded-2xl border border-[#ece8f6] bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-[#f8faff] disabled:cursor-not-allowed disabled:opacity-70"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Actualizando...' : 'Refrescar'}
            </button>
          </div>

          {error && (
            <div className="mx-5 mt-5 rounded-2xl border border-[#ffd4e7] bg-[#fff5fb] px-4 py-3 text-sm text-[#9d31ff] sm:mx-6">
              {error}
            </div>
          )}

          <div className="grid gap-4 p-5 sm:p-6 md:grid-cols-3">
            <div className="rounded-3xl border border-[#ece8f6] bg-[#f8faff] p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">Cursos</p>
                  <div className="mt-2 text-3xl font-bold text-[#9d31ff]">{stats.courses}</div>
                </div>
                <div className="rounded-2xl bg-[#9d31ff]/10 p-3 text-[#9d31ff]">
                  <BookOpen className="h-5 w-5" />
                </div>
              </div>
            </div>
            <div className="rounded-3xl border border-[#ece8f6] bg-[#f8faff] p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">Inscripciones</p>
                  <div className="mt-2 text-3xl font-bold text-[#ff318c]">{stats.enrollments}</div>
                </div>
                <div className="rounded-2xl bg-[#ff318c]/10 p-3 text-[#ff318c]">
                  <GraduationCap className="h-5 w-5" />
                </div>
              </div>
            </div>
            <div className="rounded-3xl border border-[#ece8f6] bg-[#f8faff] p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">PF promedio</p>
                  <div className="mt-2 text-3xl font-bold text-emerald-600">{stats.averagePf.toFixed(2)}</div>
                </div>
                <div className="rounded-2xl bg-emerald-500/10 p-3 text-emerald-600">
                  <TrendingUp className="h-5 w-5" />
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-[2rem] border border-[#ece8f6] bg-white shadow-2xl">
          <div className="flex flex-col gap-3 border-b border-[#ece8f6] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Mis notas</h2>
              <p className="text-sm text-slate-500">Cada curso muestra P1, P2, P3 y PF.</p>
            </div>
          </div>

          <div className="divide-y divide-[#ece8f6]">
            {sortedEnrollments.length > 0 ? (
              sortedEnrollments.map((enrollment) => (
                <div key={`${enrollment.course_id}-${enrollment.student_id}`} className="px-5 py-5">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <h3 className="text-base font-semibold text-slate-900">{enrollment.course_title}</h3>
                      <p className="mt-1 text-sm text-slate-500">
                        {enrollment.course_subject || 'Sin materia'}
                        {enrollment.course_grade_level ? ` • ${enrollment.course_grade_level}` : ''}
                      </p>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-4">
                      <GradeCell label="P1" value={enrollment.note_1} />
                      <GradeCell label="P2" value={enrollment.note_2} />
                      <GradeCell label="P3" value={enrollment.note_3} />
                      <GradeCell
                        label="PF"
                        value={enrollment.final_grade ?? calculateFinalGrade(enrollment.note_1, enrollment.note_2, enrollment.note_3)}
                        highlighted
                      />
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="px-5 py-10 text-sm text-slate-500">Aún no tienes cursos asignados con notas registradas.</div>
            )}
          </div>
        </section>
      </main>
    </div>
  )
}

function GradeCell({ label, value, highlighted = false }) {
  return (
    <div className={`min-w-20 rounded-2xl border px-4 py-3 text-center ${highlighted ? 'border-emerald-200 bg-emerald-50' : 'border-[#ece8f6] bg-[#fafafa]'}`}>
      <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400">{label}</div>
      <div className={`mt-2 text-lg font-bold ${highlighted ? 'text-emerald-700' : 'text-slate-900'}`}>
        {Number(value ?? 0).toFixed(2)}
      </div>
    </div>
  )
}
