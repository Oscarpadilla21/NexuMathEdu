import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import DashboardHeader from '../components/layout/DashboardHeader'

const EMPTY_USER = { email: '', full_name: '', role: 'student', password: '' }
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
  const { profile, logout } = useAuth()
  const navigate = useNavigate()
  const [users, setUsers] = useState([])
  const [courses, setCourses] = useState([])
  const [stats, setStats] = useState({ users: 0, teachers: 0, students: 0, courses: 0 })
  const [loading, setLoading] = useState(true)
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
  const [newUser, setNewUser] = useState(EMPTY_USER)
  const [courseForm, setCourseForm] = useState(EMPTY_COURSE)

  const teacherUsers = useMemo(() => users.filter((user) => user.role === 'teacher'), [users])
  const studentUsers = useMemo(() => users.filter((user) => user.role === 'student'), [users])
  const filteredStudentUsers = useMemo(() => {
    const query = studentSearchQuery.trim().toLowerCase()

    if (!query) {
      return studentUsers
    }

    return studentUsers.filter((student) => {
      const fullName = (student.full_name || '').toLowerCase()
      const email = (student.email || '').toLowerCase()

      return fullName.includes(query) || email.includes(query)
    })
  }, [studentSearchQuery, studentUsers])
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

  const fetchData = async () => {
    setLoading(true)
    setLoadError('')

    try {
      const [
        { data: usersResponse, error: usersError },
        { data: coursesData },
        { data: profileRows },
        { data: enrollmentsData },
      ] = await Promise.all([
        supabase.functions.invoke('list-users'),
        supabase.from('courses').select('*').order('created_at', { ascending: false }),
        supabase.from('profiles').select('*').order('created_at', { ascending: false }),
        supabase.from('enrollments').select('course_id, student_id, enrolled_at').order('enrolled_at', { ascending: false }),
      ])

      const authUsers = usersError ? [] : usersResponse?.users || []
      const profileList = profileRows || []
      const courseList = coursesData || []
      const enrollmentList = enrollmentsData || []

      const profileMap = new Map(profileList.map((user) => [user.id, user]))

      const mergedUsers = authUsers.length > 0
        ? authUsers.map((authUser) => {
            const profile = profileMap.get(authUser.id)

            return {
              id: authUser.id,
              email: authUser.email || profile?.email || '',
              full_name: profile?.full_name || authUser.full_name || authUser.email || '',
              role: profile?.role || authUser.role || 'student',
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
      setEnrollments(enrollmentList)
      setStats({
        users: mergedUsers.length,
        teachers: mergedUsers.filter((p) => p.role === 'teacher').length,
        students: mergedUsers.filter((p) => p.role === 'student').length,
        courses: courseList.length,
      })

      if (usersError) {
        setLoadError('No se pudo leer auth.users desde la Edge Function. Se estan mostrando los perfiles disponibles en Supabase.')
      }
    } catch (error) {
      setLoadError('No se pudo cargar la lista completa de usuarios.')
    }

    setLoading(false)
  }

  useEffect(() => {
    void fetchData()
  }, [])

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

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
          alert(editingCourseId ? 'Course updated' : 'Course created')
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
    setLoading(true)

    try {
      const { data, error } = await supabase.functions.invoke('create-user', {
        body: {
          email: newUser.email,
          password: newUser.password,
          full_name: newUser.full_name,
          role: newUser.role === 'admin' ? 'student' : newUser.role,
        },
      })

      if (error) {
        alert(`Error al crear usuario: ${error.message}`)
      } else {
        const createdEmail = data?.user?.email || newUser.email
        alert(`Usuario creado exitosamente: ${createdEmail}`)
        setShowUserModal(false)
        setNewUser(EMPTY_USER)
        await fetchData()
      }
    } catch (requestError) {
      alert(
        'No se pudo enviar la solicitud a la Edge Function. Revisa que la funcion create-user este desplegada en Supabase y que el proyecto del frontend sea el mismo.'
      )
    }

    setLoading(false)
  }

  const handleDeleteUser = async (userId, userEmail) => {
    if (userId === profile?.id) {
      alert('You cannot delete your own user')
      return
    }

    if (window.confirm(`Delete user ${userEmail}?`)) {
      await supabase.from('profiles').delete().eq('id', userId)
      alert('User deleted')
      await fetchData()
    }
  }

  const handleChangeRole = async (userId, newRole) => {
    if (newRole === 'admin') {
      alert('Admin role cannot be assigned from the panel')
      return
    }

    await supabase.from('profiles').update({ role: newRole }).eq('id', userId)
    alert('Role updated')
    await fetchData()
  }

  if (loading) return <div className="flex h-screen items-center justify-center">Loading...</div>

  return (
    <div className="min-h-screen bg-gray-100">
      <DashboardHeader
        subtitle={profile?.full_name || profile?.email}
        userLabel="Administrador"
        navItems={[
          { label: 'Home', to: '/admin' },
          { label: 'Mi perfil', to: '/perfil' },
          { label: 'Chat', to: '/chat' },
        ]}
        onLogout={handleLogout}
        variant="gradient"
      />

      <main className="w-full space-y-8 px-4 py-8 sm:px-6 lg:px-8">
        {loadError && (
          <section className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            {loadError}
          </section>
        )}

        <section className="rounded-lg bg-white p-6 shadow">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold">Accesos rapidos</h2>
              <p className="text-sm text-gray-500">
                El perfil y el chat de IA ahora viven en vistas dedicadas para mantener este panel enfocado en la gestion.
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
                Ver chats IA
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
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Titulo</th>
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
                    <td className="px-6 py-4 text-sm">{course.is_active ? 'Si' : 'No'}</td>
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
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Nombre</th>
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
                        {user.role === 'admin' ? (
                          <span className="inline-flex rounded bg-purple-100 px-2 py-1 text-xs font-semibold text-purple-700">
                            Administrador
                          </span>
                        ) : (
                          <select
                            value={user.role}
                            onChange={(e) => handleChangeRole(user.id, e.target.value)}
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
                            Sin perfil
                          </span>
                        ) : null}
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

        {showUserModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-md rounded-lg bg-white p-6">
              <h2 className="mb-4 text-xl font-bold">Crear nuevo usuario</h2>
              <form onSubmit={handleCreateUser}>
                <input
                  type="email"
                  placeholder="Email"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  className="mb-3 w-full rounded border px-3 py-2"
                  required
                />
                <input
                  type="text"
                  placeholder="Nombre completo"
                  value={newUser.full_name}
                  onChange={(e) => setNewUser({ ...newUser, full_name: e.target.value })}
                  className="mb-3 w-full rounded border px-3 py-2"
                  required
                />
                <input
                  type="password"
                  placeholder="Contrasena"
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  className="mb-3 w-full rounded border px-3 py-2"
                  required
                />
                <select
                  value={newUser.role}
                  onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                  className="mb-4 w-full rounded border px-3 py-2"
                >
                  <option value="student">Estudiante</option>
                  <option value="teacher">Profesor</option>
                </select>
                <div className="flex gap-2">
                  <button type="submit" className="flex-1 rounded bg-purple-600 px-4 py-2 text-white">
                    Crear
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowUserModal(false)}
                    className="flex-1 rounded bg-gray-300 px-4 py-2"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {showCourseModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-2xl rounded-lg bg-white p-6">
              <h2 className="mb-4 text-xl font-bold">{editingCourseId ? 'Editar curso' : 'Crear curso'}</h2>
              <form onSubmit={handleSaveCourse} className="space-y-3">
                <input
                  type="text"
                  placeholder="Titulo"
                  value={courseForm.title}
                  onChange={(e) => setCourseForm({ ...courseForm, title: e.target.value })}
                  className="w-full rounded border px-3 py-2"
                  required
                />
                <textarea
                  placeholder="Descripcion"
                  value={courseForm.description}
                  onChange={(e) => setCourseForm({ ...courseForm, description: e.target.value })}
                  className="w-full rounded border px-3 py-2"
                  rows="3"
                />
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <input
                    type="text"
                    placeholder="Materia"
                    value={courseForm.subject}
                    onChange={(e) => setCourseForm({ ...courseForm, subject: e.target.value })}
                    className="w-full rounded border px-3 py-2"
                  />
                  <input
                    type="text"
                    placeholder="Grado"
                    value={courseForm.grade_level}
                    onChange={(e) => setCourseForm({ ...courseForm, grade_level: e.target.value })}
                    className="w-full rounded border px-3 py-2"
                  />
                </div>
                <select
                  value={courseForm.teacher_id}
                  onChange={(e) => setCourseForm({ ...courseForm, teacher_id: e.target.value })}
                  className="w-full rounded border px-3 py-2"
                >
                  <option value="">Sin profesor asignado</option>
                  {teacherUsers.map((teacher) => (
                    <option key={teacher.id} value={teacher.id}>
                      {teacher.full_name || teacher.email}
                    </option>
                  ))}
                </select>
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={courseForm.is_active}
                    onChange={(e) => setCourseForm({ ...courseForm, is_active: e.target.checked })}
                  />
                  Curso activo
                </label>
                <div className="rounded border border-gray-200 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-semibold text-gray-800">Estudiantes del curso</h3>
                      <p className="text-xs text-gray-500">Marca los estudiantes que quedaran inscritos en este curso.</p>
                    </div>
                    <span className="rounded-full bg-purple-50 px-3 py-1 text-xs font-semibold text-purple-700">
                      {courseForm.student_ids?.length || 0} seleccionados
                    </span>
                  </div>
                  <input
                    type="text"
                    value={studentSearchQuery}
                    onChange={(e) => setStudentSearchQuery(e.target.value)}
                    placeholder="Buscar por nombre o correo"
                    className="mt-4 w-full rounded border px-3 py-2 text-sm"
                  />
                  <div className="mt-4 max-h-56 overflow-y-auto pr-1">
                    {filteredStudentUsers.length > 0 ? (
                      <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                        {filteredStudentUsers.map((student) => {
                          const checked = courseForm.student_ids?.includes(student.id)

                          return (
                            <label
                              key={student.id}
                              className={`flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-2 text-sm transition ${
                                checked ? 'border-purple-300 bg-purple-50' : 'border-gray-200 bg-white'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => toggleCourseStudent(student.id)}
                                className="mt-1"
                              />
                              <span className="flex-1">
                                <span className="block font-medium text-gray-800">
                                  {student.full_name || student.email}
                                </span>
                                <span className="block text-xs text-gray-500">{student.email}</span>
                              </span>
                            </label>
                          )
                        })}
                      </div>
                    ) : (
                      <div className="rounded-lg bg-gray-50 px-3 py-4 text-sm text-gray-500">
                        No hay resultados para tu busqueda.
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 pt-2">
                  <button
                    type="submit"
                    disabled={courseActionLoading}
                    className="flex-1 rounded bg-purple-600 px-4 py-2 text-white disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {courseActionLoading ? 'Guardando...' : 'Guardar'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowCourseModal(false)
                      setEditingCourseId(null)
                      setCourseForm(EMPTY_COURSE)
                      setStudentSearchQuery('')
                    }}
                    className="flex-1 rounded bg-gray-300 px-4 py-2"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

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
                        Este curso todavia no tiene estudiantes asignados.
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
                Esta accion eliminara el curso y sus relaciones asociadas. Para continuar, escribe exactamente el nombre del curso:
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
      </main>
    </div>
  )
}
