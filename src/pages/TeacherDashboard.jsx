import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, Users, BookOpen, GraduationCap, Pencil, Trash2, RefreshCw } from 'lucide-react'
import DashboardHeader from '../components/layout/DashboardHeader'
import UserModal from '../components/dashboard/UserModal'
import CourseModal from '../components/dashboard/CourseModal'
import EnrollmentModal from '../components/dashboard/EnrollmentModal'
import CoursePerformanceSection from '../components/dashboard/CoursePerformanceSection'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { calculateFinalGrade } from '../utils/grades'
import { withTimeout } from '../utils/withTimeout'

const EMPTY_STUDENT = {
  email: '',
  full_name: '',
  password: '',
  role: 'student',
  grade_level: '',
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

const EMPTY_ENROLLMENT = {
  course_id: '',
  student_id: '',
  student_name: '',
  student_email: '',
  note_1: '0',
  note_2: '0',
  note_3: '0',
  final_grade: 0,
}

function countStats(courses, enrollments) {
  return {
    courses: courses.length,
    students: new Set(enrollments.map((enrollment) => enrollment.student_id)).size,
    enrollments: enrollments.length,
    average_pf:
      enrollments.length > 0
        ? enrollments.reduce((sum, enrollment) => sum + Number(enrollment.final_grade || 0), 0) / enrollments.length
        : 0,
  }
}

async function loadTeacherDashboardData({
  accessToken,
  setCourses,
  setStudents,
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
    const { data, error: functionError } = await withTimeout(
      supabase.functions.invoke('teacher-dashboard-data', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }),
      10000,
      'Teacher dashboard data request timed out'
    )

    if (functionError) {
      throw functionError
    }

    setCourses(data?.courses || [])
    setStudents(data?.students || [])
    setEnrollments(data?.enrollments || [])
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
  const [enrollments, setEnrollments] = useState([])
  const [initialLoading, setInitialLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [savingStudent, setSavingStudent] = useState(false)
  const [savingCourse, setSavingCourse] = useState(false)
  const [savingEnrollment, setSavingEnrollment] = useState(false)
  const [error, setError] = useState('')
  const [showStudentModal, setShowStudentModal] = useState(false)
  const [showCourseModal, setShowCourseModal] = useState(false)
  const [showEnrollmentModal, setShowEnrollmentModal] = useState(false)
  const [studentSearch, setStudentSearch] = useState('')
  const [courseSearch, setCourseSearch] = useState('')
  const [enrollmentSearch, setEnrollmentSearch] = useState('')
  const [courseStudentSearch, setCourseStudentSearch] = useState('')
  const [newStudent, setNewStudent] = useState(EMPTY_STUDENT)
  const [courseForm, setCourseForm] = useState(EMPTY_COURSE)
  const [editingCourseId, setEditingCourseId] = useState(null)
  const [editingEnrollment, setEditingEnrollment] = useState(null)

  const navItems = [
    { label: 'Inicio', to: '/teacher' },
    { label: 'Mi perfil', to: '/perfil' },
    { label: 'Chat', to: '/chat' },
  ]

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

  const filteredStudents = useMemo(() => {
    const query = studentSearch.trim().toLowerCase()
    if (!query) return students

    return students.filter((student) => {
      const name = (student.full_name || '').toLowerCase()
      const email = (student.email || '').toLowerCase()
      return name.includes(query) || email.includes(query)
    })
  }, [studentSearch, students])

  const filteredEnrollments = useMemo(() => {
    const query = enrollmentSearch.trim().toLowerCase()
    if (!query) return enrollments

    return enrollments.filter((enrollment) => {
      const student = `${enrollment.student_name || ''} ${enrollment.student_email || ''}`.toLowerCase()
      const course = `${enrollment.course_title || ''} ${enrollment.course_subject || ''} ${enrollment.course_grade_level || ''}`.toLowerCase()
      return student.includes(query) || course.includes(query)
    })
  }, [enrollmentSearch, enrollments])

  const stats = useMemo(() => countStats(courses, enrollments), [courses, enrollments])

  const courseStudentMap = useMemo(() => {
    const map = new Map()
    courses.forEach((course) => {
      map.set(course.id, (course.students || []).map((student) => student.id))
    })
    return map
  }, [courses])

  const courseOptions = useMemo(
    () =>
      courses.map((course) => ({
        id: course.id,
        title: course.title,
      })),
    [courses]
  )

  useEffect(() => {
    const fallbackTimer = window.setTimeout(() => {
      setError((current) => current || 'La carga inicial del panel docente tardó demasiado. Mostrando la vista disponible.')
      setInitialLoading(false)
    }, 12000)

    const timer = window.setTimeout(() => {
      void loadTeacherDashboardData({
        accessToken: session?.access_token,
        setCourses,
        setStudents,
        setEnrollments,
        setLoading: setInitialLoading,
        setError,
      })
    }, 0)

    return () => {
      window.clearTimeout(timer)
      window.clearTimeout(fallbackTimer)
    }
  }, [session?.access_token])

  const handleLogout = async () => {
    await logout()
  }

  const refreshData = async () => {
    setRefreshing(true)
    await loadTeacherDashboardData({
      accessToken: session?.access_token,
      setCourses,
      setStudents,
      setEnrollments,
      setLoading: setRefreshing,
      setError,
      clearError: false,
    })
    setRefreshing(false)
  }

  const openCreateStudent = () => {
    setNewStudent(EMPTY_STUDENT)
    setShowStudentModal(true)
  }

  const openCreateCourse = () => {
    setEditingCourseId(null)
    setCourseForm({ ...EMPTY_COURSE, teacher_id: profile?.id || '' })
    setCourseStudentSearch('')
    setShowCourseModal(true)
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
          grade_level: newStudent.grade_level,
        },
      })

      if (createError) {
        throw createError
      }

      setShowStudentModal(false)
      setNewStudent(EMPTY_STUDENT)
      await refreshData()
    } catch (createError) {
      setError(createError?.message || 'No se pudo crear el alumno.')
    } finally {
      setSavingStudent(false)
    }
  }

  const openEnrollmentEditor = (enrollment) => {
    setEditingEnrollment({
      ...enrollment,
      original_course_id: enrollment.course_id,
      note_1: enrollment.note_1 ?? '0',
      note_2: enrollment.note_2 ?? '0',
      note_3: enrollment.note_3 ?? '0',
    })
    setShowEnrollmentModal(true)
  }

  const updateEnrollmentField = (field, value) => {
    setEditingEnrollment((current) => {
      if (!current) return current

      const next = { ...current, [field]: value }
      if (field === 'note_1' || field === 'note_2' || field === 'note_3') {
        next.final_grade = calculateFinalGrade(next.note_1, next.note_2, next.note_3)
      }
      return next
    })
  }

  const handleSaveEnrollment = async (e) => {
    e.preventDefault()
    if (!editingEnrollment) return

    setSavingEnrollment(true)
    setError('')

    try {
      const previousCourseId = editingEnrollment.original_course_id || editingEnrollment.course_id

      const payload = {
        course_id: editingEnrollment.course_id,
        student_id: editingEnrollment.student_id,
        note_1: Number(editingEnrollment.note_1) || 0,
        note_2: Number(editingEnrollment.note_2) || 0,
        note_3: Number(editingEnrollment.note_3) || 0,
        final_grade: calculateFinalGrade(editingEnrollment.note_1, editingEnrollment.note_2, editingEnrollment.note_3),
        updated_by: profile?.id || null,
      }

      if (previousCourseId && previousCourseId !== editingEnrollment.course_id) {
        await supabase.from('course_grades').delete().match({
          course_id: previousCourseId,
          student_id: editingEnrollment.student_id,
        })
        await supabase.from('enrollments').delete().match({
          course_id: previousCourseId,
          student_id: editingEnrollment.student_id,
        })
      }

      const { error: gradeError } = await supabase.from('course_grades').upsert(payload, {
        onConflict: 'course_id,student_id',
      })

      if (gradeError) {
        throw gradeError
      }

      if (previousCourseId !== editingEnrollment.course_id) {
        const { error: enrollmentError } = await supabase.from('enrollments').upsert(
          {
            course_id: editingEnrollment.course_id,
            student_id: editingEnrollment.student_id,
          },
          { onConflict: 'course_id,student_id' }
        )

        if (enrollmentError) {
          throw enrollmentError
        }
      }

      setShowEnrollmentModal(false)
      setEditingEnrollment(null)
      await refreshData()
    } catch (saveError) {
      setError(saveError?.message || 'No se pudieron guardar las notas.')
    } finally {
      setSavingEnrollment(false)
    }
  }

  const handleRemoveEnrollment = async () => {
    if (!editingEnrollment) return

    const confirmed = window.confirm(
      `¿Quitar a ${editingEnrollment.student_name || editingEnrollment.student_email} del curso ${editingEnrollment.course_title}?`
    )

    if (!confirmed) return

    setSavingEnrollment(true)
    setError('')

    try {
      const { error: gradeDeleteError } = await supabase.from('course_grades').delete().match({
        course_id: editingEnrollment.course_id,
        student_id: editingEnrollment.student_id,
      })
      if (gradeDeleteError) throw gradeDeleteError

      const { error: enrollmentDeleteError } = await supabase.from('enrollments').delete().match({
        course_id: editingEnrollment.course_id,
        student_id: editingEnrollment.student_id,
      })
      if (enrollmentDeleteError) throw enrollmentDeleteError

      setShowEnrollmentModal(false)
      setEditingEnrollment(null)
      await refreshData()
    } catch (removeError) {
      setError(removeError?.message || 'No se pudo quitar al estudiante del curso.')
    } finally {
      setSavingEnrollment(false)
    }
  }

  const removeEnrollmentRecord = async (targetEnrollment) => {
    if (!targetEnrollment) return

    const confirmed = window.confirm(
      `¿Quitar a ${targetEnrollment.student_name || targetEnrollment.student_email} del curso ${targetEnrollment.course_title}?`
    )

    if (!confirmed) return

    setSavingEnrollment(true)
    setError('')

    try {
      const { error: gradeDeleteError } = await supabase.from('course_grades').delete().match({
        course_id: targetEnrollment.course_id,
        student_id: targetEnrollment.student_id,
      })
      if (gradeDeleteError) throw gradeDeleteError

      const { error: enrollmentDeleteError } = await supabase.from('enrollments').delete().match({
        course_id: targetEnrollment.course_id,
        student_id: targetEnrollment.student_id,
      })
      if (enrollmentDeleteError) throw enrollmentDeleteError

      setShowEnrollmentModal(false)
      setEditingEnrollment(null)
      await refreshData()
    } catch (removeError) {
      setError(removeError?.message || 'No se pudo quitar al estudiante del curso.')
    } finally {
      setSavingEnrollment(false)
    }
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
      if (courseError) throw courseError

      const courseId = data?.id || editingCourseId
      const enrollmentError = await syncCourseEnrollments(courseId, courseForm.student_ids || [])
      if (enrollmentError) throw enrollmentError

      setShowCourseModal(false)
      setEditingCourseId(null)
      setCourseForm(EMPTY_COURSE)
      setCourseStudentSearch('')
      await refreshData()
    } catch (saveError) {
      setError(saveError?.message || 'No se pudo guardar el curso.')
    } finally {
      setSavingCourse(false)
    }
  }

  const handleRefresh = async () => {
    await refreshData()
  }

  if (initialLoading) {
    return (
      <div className="flex min-h-screen w-full flex-col bg-[#f8faff]">
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
        <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="overflow-hidden rounded-[2rem] border border-[#ece8f6] bg-white shadow-2xl">
            <div className="flex flex-col gap-3 border-b border-[#ece8f6] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Cursos</h2>
                <p className="text-sm text-slate-500">Revisa y edita los cursos asignados a tu cuenta.</p>
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
                  <div key={course.id} className="px-5 py-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
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
                        <div className="mt-3 text-xs font-medium uppercase tracking-[0.18em] text-slate-400">
                          {course.student_count || 0} alumnos
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => openEditCourse(course)}
                        className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-[#9d31ff] to-[#ff318c] px-4 py-3 text-sm font-semibold text-white shadow-lg transition hover:brightness-110"
                      >
                        <Pencil className="h-4 w-4" />
                        Editar curso
                      </button>
                    </div>
                  </div>
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
                <p className="text-sm text-slate-500">Edita notas, cambia el curso o quita a un alumno de una inscripción.</p>
              </div>
              <label className="flex items-center gap-2 rounded-2xl border border-[#ece8f6] bg-[#fafafa] px-3 py-2">
                <Search className="h-4 w-4 text-slate-400" />
                <input
                  type="search"
                  value={enrollmentSearch}
                  onChange={(e) => setEnrollmentSearch(e.target.value)}
                  placeholder="Buscar alumno o curso"
                  className="w-44 bg-transparent text-sm outline-none placeholder:text-slate-400"
                />
              </label>
            </div>

            <div className="max-h-[34rem] overflow-y-auto">
              <table className="w-full">
                <thead className="sticky top-0 bg-[#fafafa]">
                  <tr className="text-left text-xs uppercase tracking-[0.18em] text-slate-400">
                    <th className="px-5 py-3 font-semibold">Alumno</th>
                    <th className="px-5 py-3 font-semibold">Curso</th>
                    <th className="px-5 py-3 font-semibold">PF</th>
                    <th className="px-5 py-3 font-semibold">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#ece8f6]">
                  {filteredEnrollments.length > 0 ? (
                    filteredEnrollments.map((enrollment) => (
                      <tr key={`${enrollment.course_id}-${enrollment.student_id}`}>
                        <td className="px-5 py-4">
                          <div className="font-medium text-slate-900">{enrollment.student_name}</div>
                          <div className="text-sm text-slate-500">{enrollment.student_email}</div>
                        </td>
                        <td className="px-5 py-4">
                          <div className="font-medium text-slate-900">{enrollment.course_title}</div>
                          <div className="text-sm text-slate-500">
                            {enrollment.course_subject || 'Sin materia'}
                            {enrollment.course_grade_level ? ` • ${enrollment.course_grade_level}` : ''}
                          </div>
                        </td>
                        <td className="px-5 py-4 text-sm font-semibold text-emerald-600">
                          {Number(enrollment.final_grade || 0).toFixed(2)}
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => openEnrollmentEditor(enrollment)}
                              className="inline-flex items-center gap-2 rounded-full border border-[#ece8f6] bg-white px-3 py-2 text-xs font-semibold text-[#9d31ff] transition hover:bg-[#f8faff]"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                              Editar
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                void removeEnrollmentRecord(enrollment)
                              }}
                              className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-100"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              Quitar
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td className="px-5 py-8 text-sm text-slate-500" colSpan={4}>
                        No hay alumnos visibles para mostrar.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <CoursePerformanceSection
          courses={courses}
          enrollments={enrollments}
          students={students}
          scopeLabel="Vista del profesor"
          emptyMessage="Todavia no hay cursos con datos suficientes para comparar rendimiento."
        />

        <section className="overflow-hidden rounded-[2rem] border border-[#ece8f6] bg-white shadow-2xl">
          <div className="flex flex-col gap-3 border-b border-[#ece8f6] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Alumnos guardados</h2>
              <p className="text-sm text-slate-500">Los alumnos creados por ti. Para que aparezcan en "Alumnos visibles", deben estar inscritos en un curso.</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={openCreateStudent}
                className="inline-flex items-center gap-1.5 rounded-2xl bg-gradient-to-r from-[#9d31ff] to-[#ff318c] px-4 py-2 text-sm font-semibold text-white shadow-lg transition hover:brightness-110"
              >
                + Crear alumno
              </button>
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
          </div>

          <div className="max-h-[26rem] overflow-y-auto">
            <table className="w-full">
              <thead className="sticky top-0 bg-[#fafafa]">
                <tr className="text-left text-xs uppercase tracking-[0.18em] text-slate-400">
                  <th className="px-5 py-3 font-semibold">Nombre</th>
                  <th className="px-5 py-3 font-semibold">Correo</th>
                  <th className="px-5 py-3 font-semibold">Grado</th>
                  <th className="px-5 py-3 font-semibold">Accion</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#ece8f6]">
                {filteredStudents.length > 0 ? (
                  filteredStudents.map((student) => (
                    <tr key={student.id}>
                      <td className="px-5 py-4 text-sm font-medium text-slate-900">{student.full_name || 'Sin nombre'}</td>
                      <td className="px-5 py-4 text-sm text-slate-600">{student.email}</td>
                      <td className="px-5 py-4 text-sm text-slate-600">{student.grade_level || '-'}</td>
                      <td className="px-5 py-4 text-sm">
                        <button
                          type="button"
                          onClick={() => {
                            const enrollment = filteredEnrollments.find((item) => item.student_id === student.id)
                            if (enrollment) {
                              openEnrollmentEditor(enrollment)
                            } else if (courses.length > 0) {
                              const course = courses[0]
                              openEditCourse(course)
                              setError(`"${student.full_name || student.email}" no está inscrito en ningún curso. Selecciona un curso e inscríbelo.`)
                            } else {
                              setError(`"${student.full_name || student.email}" no tiene inscripciones. Crea un curso primero.`)
                            }
                          }}
                          className="rounded-full border border-[#ece8f6] bg-white px-3 py-2 text-xs font-semibold text-[#9d31ff] transition hover:bg-[#f8faff]"
                        >
                          {filteredEnrollments.some((item) => item.student_id === student.id) ? 'Ver inscripciones' : 'Inscribir en curso'}
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                      <td className="px-5 py-8 text-sm text-slate-500" colSpan={4}>
                      No hay alumnos para mostrar.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>

      <UserModal
        open={showStudentModal}
        title="Crear alumno"
        description="Se guardará y aparecerá en el listado de alumnos."
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
        title={editingCourseId ? 'Editar curso' : 'Crear curso'}
        description="Puedes ajustar la información del curso y cambiar sus alumnos asignados."
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
        submitLabel={editingCourseId ? 'Guardar cambios' : 'Guardar curso'}
        studentSectionTitle="Asignar alumnos"
        studentSectionDescription="Marca los alumnos que deben quedar inscritos en este curso."
        emptyStudentsMessage="Aún no hay alumnos creados."
      />

      <EnrollmentModal
        open={showEnrollmentModal}
        title="Notas e inscripción"
        description="Edita P1, P2, P3 y mueve al estudiante de curso si es necesario."
        enrollment={editingEnrollment}
        courses={courseOptions}
        onChange={updateEnrollmentField}
        onSubmit={handleSaveEnrollment}
        onRemove={handleRemoveEnrollment}
        onClose={() => {
          setShowEnrollmentModal(false)
          setEditingEnrollment(null)
        }}
        submitting={savingEnrollment}
      />
    </div>
  )
}
