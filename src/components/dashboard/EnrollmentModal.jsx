import { calculateFinalGrade } from '../../utils/grades'

const NOTE_FIELDS = [
  { key: 'note_1', label: 'P1' },
  { key: 'note_2', label: 'P2' },
  { key: 'note_3', label: 'P3' },
]

export default function EnrollmentModal({
  open,
  title = 'Editar inscripción',
  description,
  enrollment,
  courses = [],
  onChange,
  onSubmit,
  onRemove,
  onClose,
  submitting = false,
}) {
  if (!open || !enrollment) return null

  const finalGrade = calculateFinalGrade(enrollment.note_1, enrollment.note_2, enrollment.note_3)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
      <div className="w-full max-w-2xl rounded-[2rem] bg-white p-6 shadow-2xl">
        <h2 className="text-xl font-bold text-slate-900">{title}</h2>
        {description ? <p className="mt-2 text-sm text-slate-500">{description}</p> : null}

        <div className="mt-5 rounded-2xl border border-[#ece8f6] bg-[#fafafa] p-4">
          <div className="text-sm font-semibold text-slate-900">{enrollment.student_name || 'Sin nombre'}</div>
          <div className="text-sm text-slate-500">{enrollment.student_email}</div>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault()
            onSubmit?.(e)
          }}
          className="mt-5 space-y-4"
        >
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-700">Curso</span>
            <select
              value={enrollment.course_id}
              onChange={(e) => onChange('course_id', e.target.value)}
              className="w-full rounded-2xl border border-[#ece8f6] px-4 py-3 text-sm outline-none focus:border-[#9d31ff]/40"
            >
              {courses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.title}
                </option>
              ))}
            </select>
          </label>

          <div className="grid gap-3 sm:grid-cols-3">
            {NOTE_FIELDS.map((field) => (
              <label key={field.key} className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">{field.label}</span>
                <input
                  type="number"
                  min="0"
                  max="10"
                  step="0.01"
                  value={enrollment[field.key] ?? ''}
                  onChange={(e) => onChange(field.key, e.target.value)}
                  className="w-full rounded-2xl border border-[#ece8f6] px-4 py-3 text-sm outline-none focus:border-[#9d31ff]/40"
                />
              </label>
            ))}
          </div>

          <div className="rounded-2xl border border-[#ece8f6] bg-[#f8faff] px-4 py-3">
            <div className="text-xs uppercase tracking-[0.18em] text-slate-400">PF</div>
            <div className="mt-1 text-2xl font-semibold text-slate-900">{finalGrade.toFixed(2)}</div>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 rounded-2xl bg-gradient-to-r from-[#9d31ff] to-[#ff318c] px-4 py-3 text-sm font-semibold text-white shadow-lg disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? 'Guardando...' : 'Guardar cambios'}
            </button>
            <button
              type="button"
              onClick={onRemove}
              className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 transition hover:bg-rose-100"
            >
              Quitar
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-2xl border border-[#ece8f6] bg-white px-4 py-3 text-sm font-semibold text-slate-700"
            >
              Cerrar
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
