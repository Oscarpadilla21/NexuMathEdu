import { useMemo } from 'react'
import { Search } from 'lucide-react'

export default function CourseModal({
  open,
  title,
  description,
  course,
  onChange,
  showTeacherSelect = false,
  teacherOptions = [],
  students = [],
  studentSearch,
  onStudentSearchChange,
  onToggleStudent,
  onSubmit,
  onClose,
  submitting = false,
  submitLabel = 'Guardar curso',
  studentSectionTitle = 'Asignar alumnos',
  studentSectionDescription = 'Marca los alumnos que quedarán inscritos en este curso.',
  searchPlaceholder = 'Buscar por nombre o correo',
  emptyStudentsMessage = 'Aún no hay alumnos creados.',
  noResultsMessage = 'No hay resultados para tu búsqueda.',
}) {
  const selectedCount = course.student_ids?.length || 0

  const filteredStudents = useMemo(() => {
    const query = (studentSearch || '').trim().toLowerCase()
    if (!query) return students

    return students.filter((student) => {
      const name = (student.full_name || '').toLowerCase()
      const email = (student.email || '').toLowerCase()
      return name.includes(query) || email.includes(query)
    })
  }, [studentSearch, students])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
      <div className="w-full max-w-3xl rounded-[2rem] bg-white p-6 shadow-2xl">
        <h2 className="text-xl font-bold text-slate-900">{title}</h2>
        {description ? <p className="mt-2 text-sm text-slate-500">{description}</p> : null}

        <form onSubmit={onSubmit} className="mt-5 space-y-4">
          <input
            type="text"
            value={course.title}
            onChange={(e) => onChange('title', e.target.value)}
            placeholder="Título"
            className="w-full rounded-2xl border border-[#ece8f6] px-4 py-3 text-sm outline-none focus:border-[#9d31ff]/40"
            required
          />
          <textarea
            value={course.description}
            onChange={(e) => onChange('description', e.target.value)}
            placeholder="Descripción"
            rows={3}
            className="w-full rounded-2xl border border-[#ece8f6] px-4 py-3 text-sm outline-none focus:border-[#9d31ff]/40"
          />
          <div className="grid gap-3 md:grid-cols-2">
            <input
              type="text"
              value={course.subject}
              onChange={(e) => onChange('subject', e.target.value)}
              placeholder="Materia"
              className="w-full rounded-2xl border border-[#ece8f6] px-4 py-3 text-sm outline-none focus:border-[#9d31ff]/40"
            />
            <input
              type="text"
              value={course.grade_level}
              onChange={(e) => onChange('grade_level', e.target.value)}
              placeholder="Grado"
              className="w-full rounded-2xl border border-[#ece8f6] px-4 py-3 text-sm outline-none focus:border-[#9d31ff]/40"
            />
          </div>

          {showTeacherSelect ? (
            <select
              value={course.teacher_id || ''}
              onChange={(e) => onChange('teacher_id', e.target.value)}
              className="w-full rounded-2xl border border-[#ece8f6] px-4 py-3 text-sm outline-none focus:border-[#9d31ff]/40"
            >
              <option value="">Sin profesor asignado</option>
              {teacherOptions.map((teacher) => (
                <option key={teacher.id} value={teacher.id}>
                  {teacher.full_name || teacher.email}
                </option>
              ))}
            </select>
          ) : null}

          <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
            <input
              type="checkbox"
              checked={course.is_active}
              onChange={(e) => onChange('is_active', e.target.checked)}
            />
            Curso activo
          </label>

          <div className="rounded-[1.5rem] border border-[#ece8f6] bg-[#fafafa] p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">{studentSectionTitle}</h3>
                <p className="text-xs text-slate-500">{studentSectionDescription}</p>
              </div>
              <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-[#9d31ff]">
                {selectedCount} seleccionados
              </span>
            </div>

            <label className="mt-4 flex items-center gap-2 rounded-2xl border border-[#ece8f6] bg-white px-3 py-2">
              <Search className="h-4 w-4 text-slate-400" />
              <input
                type="search"
                value={studentSearch}
                onChange={(e) => onStudentSearchChange(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
              />
            </label>

            <div className="mt-4 max-h-72 overflow-y-auto pr-1">
              {filteredStudents.length > 0 ? (
                <div className="grid gap-2 md:grid-cols-2">
                  {filteredStudents.map((student) => {
                    const checked = course.student_ids?.includes(student.id)

                    return (
                      <label
                        key={student.id}
                        className={`flex cursor-pointer items-start gap-3 rounded-2xl border px-3 py-3 text-sm transition ${
                          checked ? 'border-[#9d31ff]/25 bg-[#f8faff]' : 'border-[#ece8f6] bg-white hover:bg-[#f8faff]'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => onToggleStudent(student.id)}
                          className="mt-1"
                        />
                        <span className="flex-1">
                          <span className="block font-medium text-slate-900">{student.full_name || student.email}</span>
                          <span className="block text-xs text-slate-500">{student.email}</span>
                        </span>
                      </label>
                    )
                  })}
                </div>
              ) : students.length > 0 ? (
                <div className="rounded-2xl border border-dashed border-[#ece8f6] bg-white px-4 py-5 text-sm text-slate-500">
                  {noResultsMessage}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-[#ece8f6] bg-white px-4 py-5 text-sm text-slate-500">
                  {emptyStudentsMessage}
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 rounded-2xl bg-gradient-to-r from-[#9d31ff] to-[#ff318c] px-4 py-3 text-sm font-semibold text-white shadow-lg disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? 'Guardando...' : submitLabel}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-2xl border border-[#ece8f6] bg-white px-4 py-3 text-sm font-semibold text-slate-700"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
