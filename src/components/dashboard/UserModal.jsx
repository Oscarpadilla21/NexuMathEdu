import { GRADE_LEVELS } from '../../constants/gradeLevels'

export default function UserModal({
  open,
  title,
  description,
  user,
  onChange,
  roleOptions,
  teacherOptions,
  gradeLevelOptions,
  onSubmit,
  onClose,
  submitting = false,
  submitLabel = 'Guardar',
}) {
  if (!open) return null

  const selectedRole = roleOptions.find((option) => option.value === user.role)
  const isStudent = user.role === 'student'
  const isTeacher = user.role === 'teacher'
  const showGradeLevel = isStudent || isTeacher

  const normalizedAssignedGrades = Array.isArray(user.assigned_grade_levels)
    ? user.assigned_grade_levels
    : typeof user.assigned_grade_levels === 'string'
    ? user.assigned_grade_levels.split(',').map((g) => g.trim()).filter(Boolean)
    : []

  const selectedGrades = isTeacher
    ? normalizedAssignedGrades
    : user.grade_level
    ? [user.grade_level]
    : []

  const handleGradeToggle = (grade) => {
    if (isTeacher) {
      const next = normalizedAssignedGrades.includes(grade)
        ? normalizedAssignedGrades.filter((g) => g !== grade)
        : [...normalizedAssignedGrades, grade]
      onChange('assigned_grade_levels', next)
    } else {
      onChange('grade_level', grade)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
      <div className="w-full max-w-md rounded-[2rem] bg-white p-6 shadow-2xl">
        <h2 className="text-xl font-bold text-slate-900">{title}</h2>
        {description ? <p className="mt-2 text-sm text-slate-500">{description}</p> : null}

        <form onSubmit={onSubmit} className="mt-5 space-y-3">
          {roleOptions.length > 0 && (
            <input
              type="email"
              value={user.email}
              onChange={(e) => onChange('email', e.target.value)}
              placeholder="Correo"
              className="w-full rounded-2xl border border-[#ece8f6] px-4 py-3 text-sm outline-none focus:border-[#9d31ff]/40"
              required
            />
          )}
          {roleOptions.length === 0 && (
            <div className="rounded-2xl border border-dashed border-[#ece8f6] bg-[#fafafa] px-4 py-3 text-sm text-slate-600">
              Correo: <span className="font-semibold text-slate-900">{user.email}</span>
            </div>
          )}
          <input
            type="text"
            value={user.full_name}
            onChange={(e) => onChange('full_name', e.target.value)}
            placeholder="Nombre completo"
            className="w-full rounded-2xl border border-[#ece8f6] px-4 py-3 text-sm outline-none focus:border-[#9d31ff]/40"
            required
          />
          {roleOptions.length > 0 && (
            <input
              type="password"
              value={user.password}
              onChange={(e) => onChange('password', e.target.value)}
              placeholder="Contraseña"
              className="w-full rounded-2xl border border-[#ece8f6] px-4 py-3 text-sm outline-none focus:border-[#9d31ff]/40"
              required
            />
          )}

          {roleOptions.length > 1 ? (
            <select
              value={user.role}
              onChange={(e) => onChange('role', e.target.value)}
              className="w-full rounded-2xl border border-[#ece8f6] px-4 py-3 text-sm outline-none focus:border-[#9d31ff]/40"
            >
              {roleOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          ) : roleOptions.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#ece8f6] bg-[#fafafa] px-4 py-3 text-sm text-slate-600">
              Rol: <span className="font-semibold text-slate-900">{selectedRole?.label || user.role}</span>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-[#ece8f6] bg-[#fafafa] px-4 py-3 text-sm text-slate-600">
              Rol fijo: <span className="font-semibold text-slate-900">{selectedRole?.label || user.role}</span>
            </div>
          )}

          {showGradeLevel && (
            <div className="rounded-2xl border border-[#ece8f6] bg-[#fafafa] p-3">
              <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">
                {isStudent ? 'Grado (obligatorio)' : 'Grados asignados (obligatorio)'}
              </label>
              <div className="max-h-40 overflow-y-auto space-y-1">
                {(gradeLevelOptions || GRADE_LEVELS).map((grade) => {
                  const checked = selectedGrades.includes(typeof grade === 'string' ? grade : grade.value)
                  const label = typeof grade === 'string' ? grade : grade.label
                  return (
                    <label key={label} className="flex cursor-pointer items-center gap-2 rounded-xl px-2 py-1.5 text-sm hover:bg-white">
                      <input
                        type={isStudent ? 'radio' : 'checkbox'}
                        name={isStudent ? 'grade_level' : undefined}
                        checked={checked}
                        onChange={() => handleGradeToggle(label)}
                        className="accent-[#9d31ff]"
                      />
                      {label}
                    </label>
                  )
                })}
              </div>
              {selectedGrades.length === 0 && (
                <p className="mt-1 text-xs text-rose-500">
                  {isStudent ? 'Selecciona un grado' : 'Selecciona al menos un grado'}
                </p>
              )}
            </div>
          )}

          {teacherOptions && isStudent && (
            <select
              value={user.assign_to_teacher_id || ''}
              onChange={(e) => onChange('assign_to_teacher_id', e.target.value)}
              className="w-full rounded-2xl border border-[#ece8f6] px-4 py-3 text-sm outline-none focus:border-[#9d31ff]/40"
            >
              <option value="">Seleccionar profesor (opcional)</option>
              {teacherOptions.map((teacher) => {
                const gradeLabel = teacher.assigned_grade_levels?.length
                  ? Array.isArray(teacher.assigned_grade_levels)
                    ? teacher.assigned_grade_levels.join(', ')
                    : teacher.assigned_grade_levels
                  : teacher.grade_level || ''
                return (
                  <option key={teacher.id} value={teacher.id}>
                    {teacher.full_name || teacher.email} {gradeLabel ? `(${gradeLabel})` : ''}
                  </option>
                )
              })}
            </select>
          )}

          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              disabled={submitting || ((isStudent || isTeacher) && selectedGrades.length === 0)}
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
