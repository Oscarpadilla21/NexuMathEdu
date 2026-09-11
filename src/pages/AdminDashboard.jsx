import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { adminService } from '../services'
import UserModal from '../components/dashboard/UserModal'
import CourseModal from '../components/dashboard/CourseModal'
import TeacherAssignmentModal from '../components/dashboard/TeacherAssignmentModal'
import CoursePerformanceSection from '../components/dashboard/CoursePerformanceSection'
import { withTimeout } from '../utils/withTimeout'

const EMPTY_USER = {
  email: '',
  full_name: '',
  role: 'student',
  password: '',
  grade_level: '',
  assign_to_teacher_id: '',
  assigned_grade_levels: [],
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

export default function AdminDashboard() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [users, setUsers] = useState([])
  const [courses, setCourses] = useState([])
  const [courseGrades, setCourseGrades] = useState([])
  const [stats, setStats] = useState({ users: 0, teachers: 0, students: 0, courses: 0 })
  const [initialLoading, setInitialLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [showUserModal, setShowUserModal] = useState(false)
  const [showCourseModal, setShowCourseModal] = useState(false)
  const [editingCourseId, setEditingCourseId] = useState(null)
  const [enrollments, setEnrollments] = useState([])
  const [viewingCourseStudents, setViewingCourseStudents] = useState(null)
  const [deletingCourse, setDeletingCourse] = useState(null)
  const [deleteCourseName, setDeleteCourseName] = useState('')
  const [studentSearchQuery, setStudentSearchQuery] = useState('')
  const [courseActionLoading, setCourseActionLoading] = useState(false)
  const [userActionLoading, setUserActionLoading] = useState(false)
  const [newUser, setNewUser] = useState(EMPTY_USER)
  const [courseForm, setCourseForm] = useState(EMPTY_COURSE)
  const [showAssignmentModal, setShowAssignmentModal] = useState(false)
  const [assignmentType, setAssignmentType] = useState('students') // 'students' | 'courses'
  const [assignmentLoading, setAssignmentLoading] = useState(false)
  const [editingUserId, setEditingUserId] = useState(null)
  const [editingUser, setEditingUser] = useState(null)

  const getFunctionErrorMessage = async (error, data, fallback) => {
    const response = error?.context

    if (response && typeof response.clone === 'function') {
      try {
        const cloned = response.clone()
        const payload = await cloned.json()
        return payload?.error || payload?.message || fallback
      } catch {
        try {
          const cloned = response.clone()
          const text = await cloned.text()
          return text || fallback
        } catch {
          // Fall through to the generic message below.
        }
      }
    }

    return data?.error || error?.message || fallback
  }

  const teacherUsers = useMemo(() => users.filter((user) => user.role === 'teacher'), [users])
  const studentUsers = useMemo(() => users.filter((user) => user.role === 'student'), [users])
  const courseStudentIdsByCourseId = useMemo(() => {
    const map = new Map()

    enrollments.forEach((enrollment) => {
      if (!map.has(enrollment.course_id)) {
        map.set(enrollment.course_id, [])
      }

      map.get(enrollment.course_id).push(enrollment.student_id)
    })

    return map
  }, [enrollments])

  const fetchData = async ({ initial = false } = {}) => {
    if (initial) {
      setInitialLoading(true)
    } else {
      setRefreshing(true)
    }
    setLoadError('')

    try {
      const [
        usersRes,
        coursesRes,
        profilesRes,
        enrollmentsRes,
        gradesRes,
      ] = await Promise.allSettled([
        withTimeout(supabase.functions.invoke('list-users'), 30000, 'La carga de usuarios tardó demasiado'),
        withTimeout(supabase.from('courses').select('*').order('created_at', { ascending: false }), 30000, 'La carga de cursos tardó demasiado'),
        withTimeout(supabase.from('profiles').select('*').order('created_at', { ascending: false }), 30000, 'La carga de perfiles tardó demasiado'),
        withTimeout(supabase.from('enrollments').select('course_id, student_id, enrolled_at').order('enrolled_at', { ascending: false }), 30000, 'La carga de inscripciones tardó demasiado'),
        withTimeout(supabase.from('course_grades').select('course_id, student_id, note_1, note_2, note_3, final_grade, updated_at').order('updated_at', { ascending: false }), 30000, 'La carga de notas tardó demasiado'),
      ])

      const usersResponse = usersRes.status === 'fulfilled' ? usersRes.value?.data : null
      const usersError = usersRes.status === 'fulfilled' ? usersRes.value?.error : (usersRes.reason || new Error('Timeout'))

      const coursesData = coursesRes.status === 'fulfilled' ? coursesRes.value?.data : null
      const profileRows = profilesRes.status === 'fulfilled' ? profilesRes.value?.data : null
      const enrollmentsData = enrollmentsRes.status === 'fulfilled' ? enrollmentsRes.value?.data : null
      const gradesData = gradesRes.status === 'fulfilled' ? gradesRes.value?.data : null

      const authUsers = usersError ? [] : usersResponse?.users || []
      const profileList = profileRows || []
      const courseList = coursesData || []
      const enrollmentList = enrollmentsData || []
      const gradeList = gradesData || []

      const profileMap = new Map(profileList.map((user) => [user.id, user]))

      const mergedUsers = authUsers.length > 0
        ? authUsers.map((authUser) => {
            const profile = profileMap.get(authUser.id)

            return {
              id: authUser.id,
              email: authUser.email || profile?.email || '',
              full_name:
                profile?.full_name || authUser.user_metadata?.full_name || authUser.full_name || authUser.email || '',
              role:
                profile?.role || authUser.user_metadata?.role || authUser.app_metadata?.role || authUser.role || 'student',
              grade_level:
                profile?.grade_level || authUser.user_metadata?.grade_level || null,
              assigned_grade_levels:
                profile?.assigned_grade_levels || authUser.user_metadata?.assigned_grade_levels || [],
              created_at: profile?.created_at || authUser.created_at,
              source: 'auth',
              has_profile: !!profile,
            }
          })
        : profileList.map((user) => ({
            ...user,
            source: 'profiles',
            has_profile: true,
          }))

      setUsers(mergedUsers)
      setCourses(courseList)
      setCourseGrades(gradeList)
      setEnrollments(enrollmentList)
      setStats({
        users: mergedUsers.length,
        teachers: mergedUsers.filter((p) => p.role === 'teacher').length,
        students: mergedUsers.filter((p) => p.role === 'student').length,
        courses: courseList.length,
      })

      const failedResources = []
      if (usersRes.status === 'rejected' || usersError) failedResources.push('usuarios auth')
      if (coursesRes.status === 'rejected') failedResources.push('cursos')
      if (profilesRes.status === 'rejected') failedResources.push('perfiles')
      if (enrollmentsRes.status === 'rejected') failedResources.push('inscripciones')
      if (gradesRes.status === 'rejected') failedResources.push('calificaciones')

      if (failedResources.length > 0) {
        setLoadError(`No se pudieron cargar todos los datos (${failedResources.join(', ')}). Mostrando información parcial disponible.`)
      }
    } catch {
      setLoadError('No se pudo cargar la lista completa de usuarios.')
    } finally {
      if (initial) {
        setInitialLoading(false)
      } else {
        setRefreshing(false)
      }
    }
  }

  useEffect(() => {
    const fallbackTimer = window.setTimeout(() => {
      setLoadError((current) => current || 'La carga inicial del panel administrativo tardó demasiado. Mostrando la vista disponible.')
      setInitialLoading(false)
    }, 12000)

    const timer = window.setTimeout(() => {
      void fetchData({ initial: true }).finally(() => {
        window.clearTimeout(fallbackTimer)
      })
    }, 0)

    return () => {
      window.clearTimeout(timer)
      window.clearTimeout(fallbackTimer)
    }
  }, [])

  const openCreateCourse = () => {
    setEditingCourseId(null)
    setCourseForm(EMPTY_COURSE)
    setStudentSearchQuery('')
    setShowCourseModal(true)
  }

  const openEditCourse = (course) => {
    setEditingCourseId(course.id)
    setCourseForm({
      title: course.title || '',
      description: course.description || '',
      subject: course.subject || '',
      grade_level: course.grade_level || '',
      teacher_id: course.teacher_id || '',
      is_active: course.is_active ?? true,
      student_ids: [...(courseStudentIdsByCourseId.get(course.id) || [])],
    })
    setStudentSearchQuery('')
    setShowCourseModal(true)
  }

  const openViewCourseStudents = (course) => {
    setViewingCourseStudents(course)
  }

  const closeViewCourseStudents = () => {
    setViewingCourseStudents(null)
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

    if (deleteError) {
      return deleteError
    }

    if (!studentIds.length) {
      return null
    }

    const enrollmentRows = studentIds.map((studentId) => ({
      course_id: courseId,
      student_id: studentId,
    }))

    const { error: insertError } = await supabase.from('enrollments').insert(enrollmentRows)
    return insertError || null
  }

  const handleSaveCourse = async (e) => {
    e.preventDefault()
    setCourseActionLoading(true)

    const payload = {
      title: courseForm.title,
      description: courseForm.description,
      subject: courseForm.subject,
      grade_level: courseForm.grade_level,
      teacher_id: courseForm.teacher_id || null,
      is_active: courseForm.is_active,
    }

    try {
      const query = editingCourseId
        ? supabase.from('courses').update(payload).eq('id', editingCourseId).select('id').single()
        : supabase.from('courses').insert([payload]).select('id').single()

      const { data: savedCourse, error } = await query

      if (error) {
        alert('Error: ' + error.message)
        } else {
          const courseId = savedCourse?.id || editingCourseId
          const enrollmentError = await syncCourseEnrollments(courseId, courseForm.student_ids || [])

        if (enrollmentError) {
          alert(`Curso guardado, pero no se pudieron sincronizar los estudiantes: ${enrollmentError.message}`)
        } else {
          alert(editingCourseId ? 'Curso actualizado' : 'Curso creado')
        }

        setShowCourseModal(false)
        setEditingCourseId(null)
        setCourseForm(EMPTY_COURSE)
        setStudentSearchQuery('')
        await fetchData()
      }
    } catch (saveError) {
      alert('Error: ' + saveError.message)
    }

    setCourseActionLoading(false)
  }

  const openDeleteCourse = (course) => {
    setDeletingCourse(course)
    setDeleteCourseName('')
  }

  const closeDeleteCourse = () => {
    setDeletingCourse(null)
    setDeleteCourseName('')
  }

  const handleDeleteCourse = async () => {
    if (!deletingCourse) return

    const expectedName = deletingCourse.title?.trim() || ''
    const typedName = deleteCourseName.trim()

    if (typedName !== expectedName) {
      alert('Debes escribir exactamente el nombre del curso para eliminarlo.')
      return
    }

    setCourseActionLoading(true)

    const { error } = await supabase.from('courses').delete().eq('id', deletingCourse.id)

    if (error) {
      alert('Error: ' + error.message)
    } else {
      alert(`Curso eliminado: ${deletingCourse.title}`)
      closeDeleteCourse()
      await fetchData()
    }

    setCourseActionLoading(false)
  }

  const handleCreateUser = async (e) => {
    e.preventDefault()
    setUserActionLoading(true)

    try {
      const body = {
        email: newUser.email,
        password: newUser.password,
        full_name: newUser.full_name,
        role: newUser.role,
      }

      if (newUser.role === 'student') {
        if (!newUser.grade_level) {
          alert('Selecciona un grado para el estudiante antes de crear el usuario.')
          setUserActionLoading(false)
          return
        }

        body.grade_level = newUser.grade_level
        if (newUser.assign_to_teacher_id) {
          body.assign_to_teacher_id = newUser.assign_to_teacher_id
        }
      }

      if (newUser.role === 'teacher') {
        body.assigned_grade_levels = Array.isArray(newUser.assigned_grade_levels)
          ? newUser.assigned_grade_levels
          : typeof newUser.assigned_grade_levels === 'string'
          ? newUser.assigned_grade_levels.split(',').map((grade) => grade.trim()).filter(Boolean)
          : []
      }

      const { data, error } = await supabase.functions.invoke('create-user', { body })

      if (error) {
        alert(`Error al crear usuario: ${error.message}`)
      } else {
        const createdEmail = data?.user?.email || newUser.email
        alert(`Usuario creado exitosamente: ${createdEmail}`)
        setShowUserModal(false)
        setNewUser(EMPTY_USER)
        await fetchData()
      }
    } catch {
      alert(
        'No se pudo crear el usuario. Intenta de nuevo más tarde o contacta al administrador del sistema.'
      )
    }

    setUserActionLoading(false)
  }

  const handleDeleteUser = async (userId, userEmail) => {
    if (userId === profile?.id) {
      alert('No puedes eliminar tu propio usuario')
      return
    }

    if (window.confirm(`¿Eliminar al usuario ${userEmail}?`)) {
      try {
        const { data, error } = await supabase.functions.invoke('delete-user', {
          body: { user_id: userId },
        })

        if (error) {
          throw new Error(data?.error || error.message || 'No se pudo eliminar el usuario')
        }

        alert(data?.message || 'Usuario eliminado')
        await fetchData()
      } catch (deleteError) {
        alert(`Error al eliminar usuario: ${deleteError?.message || 'No se pudo completar la eliminación'}`)
      }
    }
  }

  const handleChangeRole = async (user, newRole) => {
    const userId = user.id
    const userEmail = user.email
    const userFullName = user.full_name

    if (newRole === 'admin') {
      alert('El rol de administrador no se puede asignar desde el panel')
      return
    }

    const existingAssignedGrades = Array.isArray(user.assigned_grade_levels)
      ? user.assigned_grade_levels
      : typeof user.assigned_grade_levels === 'string'
      ? user.assigned_grade_levels.split(',').map((grade) => grade.trim()).filter(Boolean)
      : []

    const fallbackAssignedGrades =
      newRole === 'teacher'
        ? existingAssignedGrades.length > 0
          ? existingAssignedGrades
          : user.grade_level
          ? [user.grade_level]
          : []
        : undefined

    const { data, error } = await supabase.functions.invoke('update-user', {
      body: {
        id: userId,
        email: userEmail,
        full_name: userFullName,
        role: newRole,
        ...(fallbackAssignedGrades && fallbackAssignedGrades.length > 0 ? { assigned_grade_levels: fallbackAssignedGrades } : {}),
      },
    })

    if (error) {
      const message = await getFunctionErrorMessage(error, data, 'No se pudo actualizar el rol')
      alert(`Error al actualizar rol: ${message}`)
    } else {
      alert('Rol actualizado')
      await fetchData()
    }
  }

  const handleEditUser = (user) => {
    setEditingUserId(user.id)
    setEditingUser({
      email: user.email,
      full_name: user.full_name || '',
      role: user.role,
      password: '',
      grade_level: user.grade_level || '',
      assigned_grade_levels: Array.isArray(user.assigned_grade_levels)
        ? user.assigned_grade_levels
        : typeof user.assigned_grade_levels === 'string'
        ? user.assigned_grade_levels.split(',').map((g) => g.trim()).filter(Boolean)
        : [],
    })
    setShowUserModal(true)
  }

  const handleUpdateUser = async (e) => {
    e.preventDefault()
    if (!editingUserId || !editingUser) return

    setUserActionLoading(true)

    try {
      if (!editingUser.email) {
        alert('El usuario debe tener un correo para guardar el perfil.')
        setUserActionLoading(false)
        return
      }

      const updatePayload = {
        id: editingUserId,
        email: editingUser.email,
        full_name: editingUser.full_name,
        role: editingUser.role,
      }

      if (editingUser.role === 'student') {
        if (!editingUser.grade_level) {
          alert('Selecciona un grado para el estudiante antes de actualizar el usuario.')
          setUserActionLoading(false)
          return
        }
        updatePayload.grade_level = editingUser.grade_level
      }

      if (editingUser.role === 'teacher') {
        updatePayload.assigned_grade_levels = Array.isArray(editingUser.assigned_grade_levels)
          ? editingUser.assigned_grade_levels
          : typeof editingUser.assigned_grade_levels === 'string'
          ? editingUser.assigned_grade_levels.split(',').map((g) => g.trim()).filter(Boolean)
          : []
      }

      const { data, error } = await supabase.functions.invoke('update-user', {
        body: updatePayload,
      })

      if (error) {
        const message = await getFunctionErrorMessage(error, data, 'No se pudo actualizar el usuario')
        alert(`Error al actualizar usuario: ${message}`)
      } else {
        alert('Usuario actualizado exitosamente')
        setShowUserModal(false)
        setEditingUserId(null)
        setEditingUser(null)
        await fetchData()
      }
    } catch {
      alert('No se pudo actualizar el usuario')
    }

    setUserActionLoading(false)
  }

  const handleAssignResources = async ({ teacher_id, resource_ids, type }) => {
    setAssignmentLoading(true)
    try {
      if (type === 'students') {
        await adminService.assignStudentsToTeacher(teacher_id, resource_ids)
      } else {
        await adminService.assignCoursesToTeacher(teacher_id, resource_ids)
      }

      alert(type === 'students' ? 'Alumnos asignados exitosamente' : 'Cursos asignados exitosamente')
      await fetchData()
    } catch (err) {
      alert(`Error: ${err?.message || 'Error desconocido'}`)
    } finally {
      setAssignmentLoading(false)
    }
  }

  const openAssignStudentsModal = () => {
    setAssignmentType('students')
    setShowAssignmentModal(true)
  }

  const openAssignCoursesModal = () => {
    setAssignmentType('courses')
    setShowAssignmentModal(true)
  }

  if (initialLoading) {
    return (
      <main className="w-full flex-1 space-y-8">
        <section className="rounded-[2rem] border border-[#ece8f6] bg-white p-6 shadow-2xl">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-2">
              <div className="h-6 w-56 animate-pulse rounded-full bg-[#f1ecfb]" />
              <div className="h-4 w-80 animate-pulse rounded-full bg-[#f7f4fe]" />
            </div>
            <div className="flex gap-3">
              <div className="h-10 w-28 animate-pulse rounded-2xl bg-[#f1ecfb]" />
              <div className="h-10 w-24 animate-pulse rounded-2xl bg-[#f1ecfb]" />
            </div>
          </div>

          <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-4">
            {[...Array(4)].map((_, index) => (
              <div key={index} className="rounded-2xl border border-[#f2ecfb] bg-[#fcfbff] p-5">
                <div className="h-3 w-20 animate-pulse rounded-full bg-[#eee6fb]" />
                <div className="mt-4 h-8 w-16 animate-pulse rounded-full bg-[#eee6fb]" />
              </div>
            ))}
          </div>

          <div className="mt-8 space-y-3">
            <div className="h-4 w-56 animate-pulse rounded-full bg-[#f1ecfb]" />
            <div className="h-24 animate-pulse rounded-[1.5rem] bg-[#faf8ff]" />
          </div>
        </section>
      </main>
    )
  }

  return (
    <main className="relative w-full flex-1 space-y-8">
      {refreshing && (
        <div className="fixed inset-x-0 top-0 z-50 flex justify-center px-4 pt-4">
          <div className="inline-flex items-center gap-3 rounded-full border border-[#ece8f6] bg-white/95 px-4 py-2 text-sm font-medium text-slate-700 shadow-lg backdrop-blur">
            <span className="h-3 w-3 animate-pulse rounded-full bg-[#9d31ff]" />
            Actualizando panel...
          </div>
        </div>
      )}
        {loadError && (
          <section className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            {loadError}
          </section>
        )}

        <section className="rounded-lg bg-white p-6 shadow">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold">Accesos rápidos</h2>
              <p className="text-sm text-gray-500">
                El perfil y el chat ahora viven en vistas dedicadas para mantener este panel enfocado en la gestion.
              </p>
            </div>
            {/* Saltos directos a las pantallas que usan administradores con frecuencia. */}
            <div className="flex flex-wrap gap-3">
              <button
                onClick={openAssignStudentsModal}
                className="rounded-lg border border-purple-200 bg-purple-50 px-4 py-2 text-sm font-semibold text-purple-700 hover:bg-purple-100"
              >
                Asignar alumnos a profesor
              </button>
              <button
                onClick={openAssignCoursesModal}
                className="rounded-lg border border-purple-200 bg-purple-50 px-4 py-2 text-sm font-semibold text-purple-700 hover:bg-purple-100"
              >
                Asignar cursos a profesor
              </button>
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
                Ver chats
              </button>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-6 md:grid-cols-4">
          <div className="rounded-lg bg-white p-6 shadow">
            <div className="text-3xl font-bold text-purple-600">{stats.users}</div>
            <div className="text-gray-600">Total usuarios</div>
          </div>
          <div className="rounded-lg bg-white p-6 shadow">
            <div className="text-3xl font-bold text-blue-600">{stats.teachers}</div>
            <div className="text-gray-600">Profesores</div>
          </div>
          <div className="rounded-lg bg-white p-6 shadow">
            <div className="text-3xl font-bold text-green-600">{stats.students}</div>
            <div className="text-gray-600">Estudiantes</div>
          </div>
          <div className="rounded-lg bg-white p-6 shadow">
            <div className="text-3xl font-bold text-orange-600">{stats.courses}</div>
            <div className="text-gray-600">Cursos</div>
          </div>
        </section>

        <CoursePerformanceSection
          courses={courses}
          enrollments={enrollments}
          students={studentUsers}
          courseGrades={courseGrades}
          scopeLabel="Vista global del administrador"
          emptyMessage="Todavía no hay cursos con datos suficientes para comparar rendimiento."
        />

        <section className="overflow-hidden rounded-lg bg-white shadow">
          <div className="flex flex-col gap-3 border-b px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold">Cursos</h2>
              <p className="text-sm text-gray-500">Ver, crear y editar cursos.</p>
            </div>
            <button
              onClick={openCreateCourse}
              className="rounded-lg bg-purple-600 px-4 py-2 text-white hover:bg-purple-700"
            >
              + Crear curso
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Título</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Materia</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Grado</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Estudiantes</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Activo</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {courses.map((course) => (
                  <tr key={course.id}>
                    <td className="px-6 py-4 text-sm">{course.title}</td>
                    <td className="px-6 py-4 text-sm">{course.subject || '-'}</td>
                    <td className="px-6 py-4 text-sm">{course.grade_level || '-'}</td>
                    <td className="px-6 py-4 text-sm">{courseStudentIdsByCourseId.get(course.id)?.length || 0}</td>
                    <td className="px-6 py-4 text-sm">{course.is_active ? 'Sí' : 'No'}</td>
                    <td className="px-6 py-4 text-sm">
                      <div className="flex flex-wrap gap-3">
                        <button onClick={() => openViewCourseStudents(course)} className="text-blue-600 hover:text-blue-800">
                          Ver estudiantes
                        </button>
                        <button onClick={() => openEditCourse(course)} className="text-purple-600 hover:text-purple-800">
                          Editar
                        </button>
                        <button onClick={() => openDeleteCourse(course)} className="text-red-600 hover:text-red-800">
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="overflow-hidden rounded-lg bg-white shadow">
          <div className="flex flex-col gap-3 border-b px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold">Usuarios del sistema</h2>
              <p className="text-sm text-gray-500">Roles y usuarios.</p>
            </div>
            <button
              onClick={() => setShowUserModal(true)}
              className="rounded-lg bg-purple-600 px-4 py-2 text-white hover:bg-purple-700"
            >
              + Crear nuevo usuario
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Correo</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Nombre</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Grado</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Rol</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {users.map((user) => {
                  const isSelf = user.id === profile?.id
                  return (
                    <tr key={user.id}>
                      <td className="px-6 py-4 text-sm">{user.email}</td>
                      <td className="px-6 py-4 text-sm">{user.full_name || '-'}</td>
                      <td className="px-6 py-4 text-sm">
                        {user.role === 'teacher'
                          ? Array.isArray(user.assigned_grade_levels)
                            ? user.assigned_grade_levels.join(', ')
                            : user.assigned_grade_levels || '-'
                          : user.grade_level || '-'}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        {user.role === 'admin' ? (
                          <span className="inline-flex rounded bg-purple-100 px-2 py-1 text-xs font-semibold text-purple-700">
                            Administrador
                          </span>
                        ) : (
                          <select
                            value={user.role}
                            onChange={(e) => handleChangeRole(user, e.target.value)}
                            className="rounded border px-2 py-1 text-sm"
                          >
                            <option value="student">Estudiante</option>
                            <option value="teacher">Profesor</option>
                          </select>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        {user.source === 'auth' && !user.has_profile ? (
                          <span className="mr-3 inline-flex rounded bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-700">
                            Perfil incompleto
                          </span>
                        ) : null}
                        <button
                          onClick={() => handleEditUser(user)}
                          disabled={isSelf}
                          className="mr-3 text-blue-600 hover:text-blue-800 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          {isSelf ? 'No disponible' : 'Editar'}
                        </button>
                        <button
                          onClick={() => handleDeleteUser(user.id, user.email)}
                          disabled={isSelf}
                          className="text-red-600 hover:text-red-800 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          {isSelf ? 'No disponible' : 'Eliminar'}
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </section>

        <UserModal
          open={showUserModal}
          title={editingUserId ? 'Editar usuario' : 'Crear nuevo usuario'}
          description={editingUserId ? 'Actualiza la información del usuario.' : 'Crea cuentas de estudiante o profesor.'}
          user={editingUserId ? editingUser : newUser}
          onChange={(field, value) =>
            editingUserId
              ? setEditingUser((current) => ({ ...current, [field]: value }))
              : setNewUser((current) => ({ ...current, [field]: value }))
          }
          roleOptions={editingUserId ? [] : [
            { value: 'student', label: 'Estudiante' },
            { value: 'teacher', label: 'Profesor' },
            { value: 'admin', label: 'Administrador' },
          ]}
          teacherOptions={teacherUsers}
          onSubmit={editingUserId ? handleUpdateUser : handleCreateUser}
          onClose={() => {
            setShowUserModal(false)
            setNewUser(EMPTY_USER)
            setEditingUserId(null)
            setEditingUser(null)
          }}
          submitting={userActionLoading}
          submitLabel={editingUserId ? 'Guardar cambios' : 'Crear'}
        />

        <CourseModal
          open={showCourseModal}
          title={editingCourseId ? 'Editar curso' : 'Crear curso'}
          description="Asigna el profesor y los estudiantes inscritos en este curso."
          course={courseForm}
          onChange={(field, value) => setCourseForm((current) => ({ ...current, [field]: value }))}
          showTeacherSelect
          teacherOptions={teacherUsers}
          students={studentUsers}
          studentSearch={studentSearchQuery}
          onStudentSearchChange={setStudentSearchQuery}
          onToggleStudent={toggleCourseStudent}
          onSubmit={handleSaveCourse}
          onClose={() => {
            setShowCourseModal(false)
            setEditingCourseId(null)
            setCourseForm(EMPTY_COURSE)
            setStudentSearchQuery('')
          }}
          submitting={courseActionLoading}
          submitLabel={editingCourseId ? 'Guardar cambios' : 'Guardar'}
          studentSectionTitle="Estudiantes del curso"
          studentSectionDescription="Marca los estudiantes que quedarán inscritos en este curso."
          searchPlaceholder="Buscar por nombre o correo"
          noResultsMessage="No hay resultados para tu búsqueda."
          emptyStudentsMessage="Aún no hay estudiantes creados."
        />

        {viewingCourseStudents && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <div className="w-full max-w-2xl rounded-lg bg-white p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold">Estudiantes asignados</h2>
                  <p className="mt-1 text-sm text-gray-600">{viewingCourseStudents.title}</p>
                </div>
                <button
                  type="button"
                  onClick={closeViewCourseStudents}
                  className="rounded bg-gray-100 px-3 py-1 text-sm text-gray-700 hover:bg-gray-200"
                >
                  Cerrar
                </button>
              </div>

              <div className="mt-5 max-h-96 overflow-y-auto rounded border border-gray-200">
                {(() => {
                  const assignedIds = courseStudentIdsByCourseId.get(viewingCourseStudents.id) || []
                  const assignedStudents = studentUsers.filter((student) => assignedIds.includes(student.id))

                  if (assignedStudents.length === 0) {
                    return (
                      <div className="px-4 py-5 text-sm text-gray-500">
                        Este curso todavía no tiene estudiantes asignados.
                      </div>
                    )
                  }

                  return (
                    <ul className="divide-y divide-gray-200">
                      {assignedStudents.map((student) => (
                        <li key={student.id} className="px-4 py-4">
                          <div className="font-medium text-gray-800">{student.full_name || student.email}</div>
                          <div className="text-sm text-gray-500">{student.email}</div>
                        </li>
                      ))}
                    </ul>
                  )
                })()}
              </div>
            </div>
          </div>
        )}

        {deletingCourse && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <div className="w-full max-w-lg rounded-lg bg-white p-6">
              <h2 className="text-xl font-bold text-red-700">Eliminar curso</h2>
              <p className="mt-2 text-sm text-gray-600">
                Esta acción eliminará el curso y sus relaciones asociadas. Para continuar, escribe exactamente el nombre del curso:
              </p>
              <div className="mt-4 rounded-lg bg-gray-50 p-3">
                <div className="text-sm font-semibold text-gray-700">{deletingCourse.title}</div>
              </div>
              <input
                type="text"
                value={deleteCourseName}
                onChange={(e) => setDeleteCourseName(e.target.value)}
                placeholder="Escribe el nombre del curso"
                className="mt-4 w-full rounded border px-3 py-2"
                autoFocus
              />
              <div className="mt-5 flex gap-2">
                <button
                  type="button"
                  onClick={handleDeleteCourse}
                  disabled={courseActionLoading || deleteCourseName.trim() !== (deletingCourse.title?.trim() || '')}
                  className="flex-1 rounded bg-red-600 px-4 py-2 text-white disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {courseActionLoading ? 'Eliminando...' : 'Eliminar curso'}
                </button>
                <button
                  type="button"
                  onClick={closeDeleteCourse}
                  disabled={courseActionLoading}
                  className="flex-1 rounded bg-gray-300 px-4 py-2 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}

        <TeacherAssignmentModal
          open={showAssignmentModal}
          assignmentType={assignmentType}
          teachers={teacherUsers}
          students={studentUsers}
          courses={courses}
          onSubmit={handleAssignResources}
          onClose={() => setShowAssignmentModal(false)}
          submitting={assignmentLoading}
        />
      </main>
  )
}
