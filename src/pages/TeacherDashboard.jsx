import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import DashboardHeader from '../components/layout/DashboardHeader'

export default function TeacherDashboard() {
  const { profile, logout } = useAuth()
  const navigate = useNavigate()
  const [students, setStudents] = useState([])
  const [loading] = useState(false)
  const [selectedCourse, setSelectedCourse] = useState(null)
  const [grades, setGrades] = useState({})

  const fetchStudentsForCourse = async () => {
    setStudents([
      { id: 1, name: 'Ana García', email: 'ana@email.com', grade: 4.5 },
      { id: 2, name: 'Luis Pérez', email: 'luis@email.com', grade: 3.8 },
      { id: 3, name: 'María López', email: 'maria@email.com', grade: 4.2 },
    ])
  }

  const demoCourses = [
    { id: 1, name: 'Matemáticas 9°', topic: 'Ecuaciones lineales', students: 25 },
    { id: 2, name: 'Álgebra 10°', topic: 'Funciones', students: 20 },
  ]

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  const handleSelectCourse = (course) => {
    setSelectedCourse(course)
    fetchStudentsForCourse(course.id)
  }

  const handleGradeChange = (studentId, value) => {
    setGrades({ ...grades, [studentId]: value })
  }

  const handleSaveGrades = async () => {
    alert('Calificaciones guardadas (demo)')
    console.log('Grades saved:', grades)
  }

  if (loading) return <div className="flex justify-center items-center h-screen">Cargando...</div>

  return (
    <div className="min-h-screen bg-gray-100">
      <DashboardHeader
        subtitle={profile?.full_name || profile?.email}
        userLabel="Profesor"
        navItems={[
          { label: 'Home', to: '/teacher' },
          { label: 'Mi perfil', to: '/perfil' },
          { label: 'Chat', to: '/chat' },
        ]}
        onLogout={handleLogout}
        variant="gradient"
      />

      <main className="w-full px-4 sm:px-6 lg:px-8 py-8">
        <section className="mb-6 bg-white rounded-lg shadow p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold">Accesos rápidos</h2>
              <p className="text-sm text-gray-500">
                Tu perfil y el chat de IA viven ahora en páginas separadas para una navegación más clara.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => navigate('/perfil')}
                className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-100"
              >
                Abrir mi perfil
              </button>
              <button
                onClick={() => navigate('/chat')}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
              >
                Ir al chat IA
              </button>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div id="cursos" className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">Mis cursos</h2>
            <div className="space-y-2">
              {demoCourses.map((course) => (
                <button
                  key={course.id}
                  onClick={() => handleSelectCourse(course)}
                  className={`w-full text-left p-3 rounded-lg transition ${
                    selectedCourse?.id === course.id
                      ? 'bg-blue-100 border-blue-500'
                      : 'bg-gray-50 hover:bg-gray-100'
                  }`}
                >
                  <div className="font-medium">{course.name}</div>
                  <div className="text-sm text-gray-600">{course.topic}</div>
                  <div className="text-xs text-gray-400">{course.students} estudiantes</div>
                </button>
              ))}
            </div>
          </div>

          <div id="calificaciones" className="lg:col-span-2 bg-white rounded-lg shadow p-6">
            {selectedCourse ? (
              <>
                <h2 className="text-lg font-semibold mb-4">
                  {selectedCourse.name} - Calificaciones
                </h2>
                <div className="space-y-3">
                  {students.map((student) => (
                    <div key={student.id} className="flex items-center justify-between border-b pb-3">
                      <div>
                        <div className="font-medium">{student.name}</div>
                        <div className="text-sm text-gray-500">{student.email}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          max="5"
                          defaultValue={student.grade}
                          onChange={(e) => handleGradeChange(student.id, e.target.value)}
                          className="w-20 px-2 py-1 border rounded text-center"
                        />
                        <span className="text-sm text-gray-500">/ 5.0</span>
                      </div>
                    </div>
                  ))}
                  <button
                    onClick={handleSaveGrades}
                    className="mt-4 w-full bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
                  >
                    Guardar calificaciones
                  </button>
                </div>
              </>
            ) : (
              <div className="text-center text-gray-500 py-12">
                Selecciona un curso para ver y calificar estudiantes
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
