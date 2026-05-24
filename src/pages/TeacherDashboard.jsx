import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, Users, BookOpen, GraduationCap, ChevronRight } from 'lucide-react'
import DashboardHeader from '../components/layout/DashboardHeader'
import UserModal from '../components/dashboard/UserModal'
import CourseModal from '../components/dashboard/CourseModal'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

const EMPTY_STUDENT = {
  email: '',
  full_name: '',
  password: '',
}

const EMPTY_COURSE = {
  title: '',
  description: '',
  subject: '',
  grade_level: '',
  teacher_id: '',
  is_active: true,
  student_ids: [],
}

function countStats(courses, students) {
  const enrollments = courses.reduce((total, course) => total + (course.students?.length || 0), 0)

  return {
    courses: courses.length,
    students: students.length,
    enrollments,
  }
}

async function loadTeacherDashboardData({
  accessToken,
  setCourses,
  setStudents,
  setSelectedCourseId,
  setLoading,
  setError,
}) {
  if (!accessToken) {
    setLoading(false)
    return
  }

  setLoading(true)
  setError('')

  try {
    const { data, error: functionError } = await supabase.functions.invoke('teacher-dashboard-data', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })

    if (functionError) {
      throw functionError
    }

    setCourses(data?.courses || [])
    setStudents(data?.students || [])
    setSelectedCourseId((current) => current || data?.courses?.[0]?.id || null)
  } catch (fetchError) {
    setError(fetchError?.message || 'No se pudo cargar la informacion del profesor.')
  } finally {
    setLoading(false)
  }
}

export default function TeacherDashboard() {
  const { profile, session, logout } = useAuth()
  const navigate = useNavigate()
  const [students, setStudents] = useState([])
  const [courses, setCourses] = useState([])
  const [loading, setLoading] = useState(true)
  const [savingStudent, setSavingStudent] = useState(false)
  const [savingCourse, setSavingCourse] = useState(false)
  const [error, setError] = useState('')
  const [showStudentModal, setShowStudentModal] = useState(false)
  const [showCourseModal, setShowCourseModal] = useState(false)
  const [selectedCourseId, setSelectedCourseId] = useState(null)
  const [studentSearch, setStudentSearch] = useState('')
  const [courseSearch, setCourseSearch] = useState('')
  const [courseStudentSearch, setCourseStudentSearch] = useState('')
  const [newStudent, setNewStudent] = useState(EMPTY_STUDENT)
  const [courseForm, setCourseForm] = useState(EMPTY_COURSE)
  const [editingCourseId, setEditingCourseId] = useState(null)

  const navItems = [
    { label: 'Inicio', to: '/teacher' },
    { label: 'Mi perfil', to: '/perfil' },
    { label: 'Chat', to: '/chat' },
  ]

  const selectedCourse = useMemo(
    () => courses.find((course) => course.id === selectedCourseId) || null,
    [courses, selectedCourseId]
  )

  const filteredStudents = useMemo(() => {
    const query = studentSearch.trim().toLowerCase()

    if (!query) return students

    return students.filter((student) => {
      const name = (student.full_name || '').toLowerCase()
      const email = (student.email || '').toLowerCase()
      return name.includes(query) || email.includes(query)
    })
  }, [studentSearch, students])

  const filteredCourses = useMemo(() => {
    const query = courseSearch.trim().toLowerCase()

    if (!query) return courses

    return courses.filter((course) => {
      const title = (course.title || '').toLowerCase()
      const subject = (course.subject || '').toLowerCase()
      const grade = (course.grade_level || '').toLowerCase()
      return title.includes(query) || subject.includes(query) || grade.includes(query)
    })
  }, [courseSearch, courses])

  const stats = useMemo(() => countStats(courses, students), [courses, students])

  const courseStudentIds = useMemo(() => {
    if (!selectedCourse) return []
    return (selectedCourse.students || []).map((student) => student.id)
  }, [selectedCourse])

  const courseStudentMap = useMemo(() => {
    const map = new Map()
    courses.forEach((course) => {
      map.set(course.id, (course.students || []).map((student) => student.id))
    })
    return map
  }, [courses])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadTeacherDashboardData({
        accessToken: session?.access_token,
        setCourses,
        setStudents,
        setSelectedCourseId,
        setLoading,
        setError,
      })
    }, 0)

    return () => window.clearTimeout(timer)
  }, [session?.access_token])

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  const openCreateStudent = () => {
    setNewStudent(EMPTY_STUDENT)
    setShowStudentModal(true)
  }

  const openEditCourse = (course) => {
    setEditingCourseId(course.id)
    setCourseForm({
      title: course.title || '',
      description: course.description || '',
      subject: course.subject || '',
      grade_level: course.grade_level || '',
      teacher_id: course.teacher_id || profile?.id || '',
      is_active: course.is_active ?? true,
      student_ids: courseStudentMap.get(course.id) || [],
    })
    setCourseStudentSearch('')
    setShowCourseModal(true)
  }

  const toggleCourseStudent = (studentId) => {
    setCourseForm((current) => {
      const currentIds = current.student_ids || []
      const nextIds = currentIds.includes(studentId)
        ? currentIds.filter((id) => id !== studentId)
        : [...currentIds, studentId]

      return {
        ...current,
        student_ids: nextIds,
      }
    })
  }

  const syncCourseEnrollments = async (courseId, studentIds) => {
    if (!courseId) {
      return new Error('No se pudo identificar el curso guardado.')
    }

    const { error: deleteError } = await supabase.from('enrollments').delete().eq('course_id', courseId)
    if (deleteError) return deleteError

    if (!studentIds.length) return null

    const rows = studentIds.map((studentId) => ({
      course_id: courseId,
      student_id: studentId,
    }))

    const { error: insertError } = await supabase.from('enrollments').insert(rows)
    return insertError || null
  }

  const handleCreateStudent = async (e) => {
    e.preventDefault()
    setSavingStudent(true)
    setError('')

    try {
      const { error: createError } = await supabase.functions.invoke('create-user', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: {
          email: newStudent.email,
          password: newStudent.password,
          full_name: newStudent.full_name,
          role: 'student',
        },
      })

      if (createError) {
        throw createError
      }

      setShowStudentModal(false)
      setNewStudent(EMPTY_STUDENT)
      await loadTeacherDashboardData({
        accessToken: session?.access_token,
        setCourses,
        setStudents,
        setSelectedCourseId,
        setLoading,
        setError,
      })
    } catch (createError) {
      setError(createError?.message || 'No se pudo crear el alumno.')
    } finally {
      setSavingStudent(false)
    }
  }

  const openSelectedCourseWithStudent = (studentId) => {
    if (!selectedCourse) {
      setError('Selecciona un curso antes de asignar alumnos.')
      return
    }

    setEditingCourseId(selectedCourse.id)
    setCourseForm({
      title: selectedCourse.title || '',
      description: selectedCourse.description || '',
      subject: selectedCourse.subject || '',
      grade_level: selectedCourse.grade_level || '',
      teacher_id: selectedCourse.teacher_id || profile?.id || '',
      is_active: selectedCourse.is_active ?? true,
      student_ids: Array.from(new Set([...(courseStudentIds || []), studentId])),
    })
    setCourseStudentSearch('')
    setShowCourseModal(true)
  }

  const handleSaveCourse = async (e) => {
    e.preventDefault()
    setSavingCourse(true)
    setError('')

    try {
      const payload = {
        title: courseForm.title,
        description: courseForm.description,
        subject: courseForm.subject,
        grade_level: courseForm.grade_level,
        teacher_id: courseForm.teacher_id || profile?.id || null,
        is_active: courseForm.is_active,
      }

      const query = editingCourseId
        ? supabase.from('courses').update(payload).eq('id', editingCourseId).select('id').single()
        : supabase.from('courses').insert([payload]).select('id').single()

      const { data, error: courseError } = await query
      if (courseError) {
        throw courseError
      }

      const courseId = data?.id || editingCourseId
      const enrollmentError = await syncCourseEnrollments(courseId, courseForm.student_ids || [])
      if (enrollmentError) {
        throw enrollmentError
      }

      setShowCourseModal(false)
      setEditingCourseId(null)
      setCourseForm(EMPTY_COURSE)
      setCourseStudentSearch('')

      await loadTeacherDashboardData({
        accessToken: session?.access_token,
        setCourses,
        setStudents,
        setSelectedCourseId,
        setLoading,
        setError,
      })
      setSelectedCourseId(courseId)
    } catch (saveError) {
      setError(saveError?.message || 'No se pudo guardar el curso.')
    } finally {
      setSavingCourse(false)
    }
  }

  const handleRefresh = async () => {
    await loadTeacherDashboardData({
      accessToken: session?.access_token,
      setCourses,
      setStudents,
      setSelectedCourseId,
      setLoading,
      setError,
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8faff]">
        <DashboardHeader
          subtitle={profile?.full_name || profile?.email}
          userLabel={profile?.full_name || profile?.email || 'Profesor'}
          navItems={navItems}
          onLogout={handleLogout}
          variant="gradient"
          showSubtitle={false}
        />
        <div className="flex min-h-[70svh] items-center justify-center px-4">
          <div className="rounded-3xl border border-[#ece8f6] bg-white px-6 py-5 text-sm text-slate-600 shadow-2xl">
            Cargando panel docente...
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen w-full flex-col bg-[#f8faff] text-slate-900">
      <DashboardHeader
        subtitle={profile?.full_name || profile?.email}
        userLabel={profile?.full_name || profile?.email || 'Profesor'}
        navItems={navItems}
        onLogout={handleLogout}
        variant="gradient"
        showSubtitle={false}
      />

      <main className="flex w-full flex-1 flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <section className="overflow-hidden rounded-[2rem] border border-[#ece8f6] bg-white shadow-2xl">
          <div className="flex flex-col gap-4 border-b border-[#ece8f6] px-5 py-5 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-[#9d31ff]">Profesor</p>
              <h1 className="mt-2 text-3xl font-semibold text-slate-900">Panel docente</h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                Aqui puedes crear alumnos y revisar los cursos asignados, viendo solo los estudiantes vinculados a esos cursos.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={openCreateStudent}
                className="inline-flex items-center gap-2 rounded-2xl border border-[#ece8f6] bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-[#f8faff]"
              >
                <Plus className="h-4 w-4" />
                Crear alumno
              </button>
            </div>
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
                  <p className="text-sm text-slate-500">Alumnos</p>
                  <div className="mt-2 text-3xl font-bold text-[#ff318c]">{stats.students}</div>
                </div>
                <div className="rounded-2xl bg-[#ff318c]/10 p-3 text-[#ff318c]">
                  <Users className="h-5 w-5" />
                </div>
              </div>
            </div>
            <div className="rounded-3xl border border-[#ece8f6] bg-[#f8faff] p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">Asignaciones</p>
                  <div className="mt-2 text-3xl font-bold text-slate-900">{stats.enrollments}</div>
                </div>
                <div className="rounded-2xl bg-slate-900/10 p-3 text-slate-900">
                  <GraduationCap className="h-5 w-5" />
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="overflow-hidden rounded-[2rem] border border-[#ece8f6] bg-white shadow-2xl">
            <div className="flex flex-col gap-3 border-b border-[#ece8f6] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Cursos</h2>
                <p className="text-sm text-slate-500">Revisa y edita tus cursos asignados.</p>
              </div>
              <label className="flex items-center gap-2 rounded-2xl border border-[#ece8f6] bg-[#fafafa] px-3 py-2">
                <Search className="h-4 w-4 text-slate-400" />
                <input
                  type="search"
                  value={courseSearch}
                  onChange={(e) => setCourseSearch(e.target.value)}
                  placeholder="Buscar curso"
                  className="w-40 bg-transparent text-sm outline-none placeholder:text-slate-400"
                />
              </label>
            </div>

            <div className="divide-y divide-[#ece8f6]">
              {filteredCourses.length > 0 ? (
                filteredCourses.map((course) => (
                  <button
                    key={course.id}
                    type="button"
                    onClick={() => setSelectedCourseId(course.id)}
                    className={`w-full px-5 py-4 text-left transition hover:bg-[#f8faff] ${
                      selectedCourseId === course.id ? 'bg-[#f8faff]' : ''
                    }`}
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-semibold text-slate-900">{course.title}</h3>
                          <span
                            className={`rounded-full px-2 py-1 text-[11px] font-semibold ${
                              course.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                            }`}
                          >
                            {course.is_active ? 'Activo' : 'Inactivo'}
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-slate-500">
                          {course.subject || 'Sin materia'} {course.grade_level ? ` • ${course.grade_level}` : ''}
                        </p>
                        <p className="mt-2 text-sm leading-6 text-slate-600">{course.description || 'Sin descripcion.'}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="rounded-2xl border border-[#ece8f6] bg-white px-4 py-3 text-center">
                          <div className="text-lg font-bold text-[#9d31ff]">{course.student_count || 0}</div>
                          <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400">alumnos</div>
                        </div>
                        <ChevronRight className="h-5 w-5 text-slate-300" />
                      </div>
                    </div>
                  </button>
                ))
              ) : (
                <div className="px-5 py-10 text-sm text-slate-500">No hay cursos para mostrar.</div>
              )}
            </div>
          </div>

          <div className="overflow-hidden rounded-[2rem] border border-[#ece8f6] bg-white shadow-2xl">
            <div className="flex flex-col gap-3 border-b border-[#ece8f6] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Alumnos visibles</h2>
                <p className="text-sm text-slate-500">Solo se muestran los estudiantes de tus cursos asignados.</p>
              </div>
              <label className="flex items-center gap-2 rounded-2xl border border-[#ece8f6] bg-[#fafafa] px-3 py-2">
                <Search className="h-4 w-4 text-slate-400" />
                <input
                  type="search"
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                  placeholder="Buscar alumno"
                  className="w-40 bg-transparent text-sm outline-none placeholder:text-slate-400"
                />
              </label>
            </div>

            <div className="max-h-[32rem] overflow-y-auto">
              <table className="w-full">
                <thead className="sticky top-0 bg-[#fafafa]">
                  <tr className="text-left text-xs uppercase tracking-[0.18em] text-slate-400">
                    <th className="px-5 py-3 font-semibold">Nombre</th>
                    <th className="px-5 py-3 font-semibold">Correo</th>
                    <th className="px-5 py-3 font-semibold">Accion</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#ece8f6]">
                  {filteredStudents.length > 0 ? (
                    filteredStudents.map((student) => (
                      <tr key={student.id}>
                        <td className="px-5 py-4 text-sm font-medium text-slate-900">{student.full_name || 'Sin nombre'}</td>
                        <td className="px-5 py-4 text-sm text-slate-600">{student.email}</td>
                        <td className="px-5 py-4 text-sm">
                          <button
                            type="button"
                            onClick={() => openSelectedCourseWithStudent(student.id)}
                            className="rounded-full border border-[#ece8f6] bg-white px-3 py-2 text-xs font-semibold text-[#9d31ff] transition hover:bg-[#f8faff]"
                          >
                            Asignar a curso
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td className="px-5 py-8 text-sm text-slate-500" colSpan={3}>
                        No hay alumnos para mostrar.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-[2rem] border border-[#ece8f6] bg-white shadow-2xl">
          <div className="flex flex-col gap-3 border-b border-[#ece8f6] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Curso seleccionado</h2>
              <p className="text-sm text-slate-500">Aqui ves los alumnos asignados y puedes editar el curso.</p>
            </div>
            <button
              type="button"
              onClick={handleRefresh}
              className="rounded-2xl border border-[#ece8f6] bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-[#f8faff]"
            >
              Refrescar
            </button>
          </div>

          {selectedCourse ? (
            <div className="grid gap-5 p-5 lg:grid-cols-[1.1fr_0.9fr]">
              <div className="rounded-3xl border border-[#ece8f6] bg-[#fafafa] p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-[#9d31ff]">Curso</p>
                    <h3 className="mt-2 text-2xl font-semibold text-slate-900">{selectedCourse.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{selectedCourse.description || 'Sin descripcion.'}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => openEditCourse(selectedCourse)}
                    className="rounded-2xl bg-gradient-to-r from-[#9d31ff] to-[#ff318c] px-4 py-3 text-sm font-semibold text-white shadow-lg transition hover:brightness-110"
                  >
                    Editar curso
                  </button>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl border border-[#ece8f6] bg-white p-4">
                    <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Materia</div>
                    <div className="mt-2 text-sm font-semibold text-slate-900">{selectedCourse.subject || '-'}</div>
                  </div>
                  <div className="rounded-2xl border border-[#ece8f6] bg-white p-4">
                    <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Grado</div>
                    <div className="mt-2 text-sm font-semibold text-slate-900">{selectedCourse.grade_level || '-'}</div>
                  </div>
                  <div className="rounded-2xl border border-[#ece8f6] bg-white p-4">
                    <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Alumnos</div>
                    <div className="mt-2 text-sm font-semibold text-slate-900">{selectedCourse.student_count || 0}</div>
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-[#ece8f6] bg-white p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-[#9d31ff]">Asignados</p>
                    <h3 className="mt-2 text-lg font-semibold text-slate-900">Alumnos en este curso</h3>
                  </div>
                  <span className="rounded-full bg-[#f8faff] px-3 py-1 text-xs font-semibold text-[#9d31ff]">
                    {courseStudentIds.length} seleccionados
                  </span>
                </div>

                <div className="mt-4 max-h-72 space-y-2 overflow-y-auto pr-1">
                  {selectedCourse.students?.length > 0 ? (
                    selectedCourse.students.map((student) => (
                      <div key={student.id} className="rounded-2xl border border-[#ece8f6] bg-[#fafafa] px-4 py-3">
                        <div className="font-medium text-slate-900">{student.full_name || student.email}</div>
                        <div className="text-sm text-slate-500">{student.email}</div>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-2xl border border-dashed border-[#ece8f6] bg-[#fafafa] px-4 py-6 text-sm text-slate-500">
                      Aun no hay alumnos asignados a este curso.
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="px-5 py-12 text-sm text-slate-500">Selecciona un curso para ver sus alumnos asignados.</div>
          )}
        </section>
      </main>

      <UserModal
        open={showStudentModal}
        title="Crear alumno"
        description="Se guardara en Supabase y aparecera en el listado de alumnos."
        user={newStudent}
        onChange={(field, value) => setNewStudent((current) => ({ ...current, [field]: value }))}
        roleOptions={[{ value: 'student', label: 'Estudiante' }]}
        onSubmit={handleCreateStudent}
        onClose={() => setShowStudentModal(false)}
        submitting={savingStudent}
        submitLabel="Crear alumno"
      />

      <CourseModal
        open={showCourseModal}
        title="Editar curso"
        description="Puedes ajustar la informacion del curso y cambiar sus alumnos asignados."
        course={courseForm}
        onChange={(field, value) => setCourseForm((current) => ({ ...current, [field]: value }))}
        showTeacherSelect={false}
        students={students}
        studentSearch={courseStudentSearch}
        onStudentSearchChange={setCourseStudentSearch}
        onToggleStudent={toggleCourseStudent}
        onSubmit={handleSaveCourse}
        onClose={() => {
          setShowCourseModal(false)
          setEditingCourseId(null)
          setCourseForm(EMPTY_COURSE)
          setCourseStudentSearch('')
        }}
        submitting={savingCourse}
        submitLabel="Guardar curso"
        studentSectionTitle="Asignar alumnos"
        studentSectionDescription="Marca los alumnos que deben quedar inscritos en este curso."
        emptyStudentsMessage="Aun no hay alumnos creados."
      />
    </div>
  )
}
