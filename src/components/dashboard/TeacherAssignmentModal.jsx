import { useState, useMemo } from 'react'
import { X, Check, AlertCircle } from 'lucide-react'

export default function TeacherAssignmentModal({
  open,
  title = 'Asignar recursos',
  teachers = [],
  students = [],
  courses = [],
  assignmentType = 'students', // 'students' | 'courses'
  onSubmit,
  onClose,
  submitting = false,
}) {
  const [selectedTeacherId, setSelectedTeacherId] = useState('')
  const [selectedResourceIds, setSelectedResourceIds] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const resources = assignmentType === 'students' ? students : courses
  const resourceLabel = assignmentType === 'students' ? 'Alumno' : 'Curso'
  const resourceNameField = assignmentType === 'students' ? 'full_name' : 'title'
  const resourceEmailField = assignmentType === 'students' ? 'email' : 'subject'

  const filteredResources = useMemo(() => {
    if (!searchQuery.trim()) return resources

    const q = searchQuery.toLowerCase()
    return resources.filter((r) => {
      const name = (r[resourceNameField] || '').toLowerCase()
      const secondary = (r[resourceEmailField] || '').toLowerCase()
      return name.includes(q) || secondary.includes(q)
    })
  }, [searchQuery, resources, resourceNameField, resourceEmailField])

  const toggleResourceSelection = (resourceId) => {
    setSelectedResourceIds((current) =>
      current.includes(resourceId) ? current.filter((id) => id !== resourceId) : [...current, resourceId]
    )
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!selectedTeacherId) {
      setError('Selecciona un profesor')
      return
    }

    if (selectedResourceIds.length === 0) {
      setError(`Selecciona al menos un ${resourceLabel.toLowerCase()}`)
      return
    }

    try {
      await onSubmit({
        teacher_id: selectedTeacherId,
        resource_ids: selectedResourceIds,
        type: assignmentType,
      })

      setSuccess(`${selectedResourceIds.length} ${resourceLabel.toLowerCase()}(s) asignado(s) exitosamente`)
      setTimeout(() => {
        setSelectedTeacherId('')
        setSelectedResourceIds([])
        setSearchQuery('')
        onClose()
      }, 1500)
    } catch (err) {
      setError(err?.message || `Error al asignar ${resourceLabel.toLowerCase()}(s)`)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-3 sm:p-4">
      <div className="flex h-[90svh] w-full max-w-2xl flex-col overflow-hidden rounded-[2rem] border border-white/10 bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-[#ece8f6] px-5 py-4 sm:px-6">
          <div>
            <h3 className="text-2xl font-semibold text-slate-900">{title}</h3>
            <p className="mt-2 text-sm text-slate-500">
              {assignmentType === 'students'
                ? 'Asigna alumnos a un profesor para que los vea en su panel.'
                : 'Asigna cursos a un profesor para que pueda gestionarlos.'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="inline-flex items-center gap-2 rounded-2xl border border-[#ece8f6] bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-[#f8faff]"
          >
            <X className="h-4 w-4" />
            Cerrar
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="grid min-h-0 flex-1 gap-0 lg:grid-cols-[300px_1fr]">
            {/* Sidebar: Teacher selection */}
            <div className="border-b border-[#ece8f6] bg-[#fafafa] p-4 lg:border-b-0 lg:border-r">
              <div>
                <label className="block">
                  <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">
                    Profesor
                  </span>
                  <select
                    value={selectedTeacherId}
                    onChange={(e) => {
                      setSelectedTeacherId(e.target.value)
                      setSelectedResourceIds([])
                      setSearchQuery('')
                    }}
                    className="w-full rounded-2xl border border-[#ece8f6] bg-white px-3 py-3 text-sm outline-none focus:border-[#9d31ff]"
                  >
                    <option value="">Selecciona un profesor...</option>
                    {teachers.map((teacher) => (
                      <option key={teacher.id} value={teacher.id}>
                        {teacher.full_name || teacher.email}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              {selectedTeacherId && (
                <div className="mt-4 rounded-2xl border border-[#9d31ff]/25 bg-[#f8faff] p-3">
                  <div className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 text-[#9d31ff]" />
                    <div>
                      <div className="text-xs font-semibold text-[#9d31ff]">Profesor seleccionado</div>
                      <div className="text-sm font-medium text-slate-900">
                        {teachers.find((t) => t.id === selectedTeacherId)?.full_name}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Main: Resource list */}
            <div className="min-h-0 overflow-y-auto p-4">
              {selectedTeacherId ? (
                <div className="space-y-3">
                  <label className="block">
                    <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">
                      Buscar {resourceLabel.toLowerCase()}
                    </span>
                    <input
                      type="text"
                      placeholder={`Nombre o email del ${resourceLabel.toLowerCase()}...`}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full rounded-2xl border border-[#ece8f6] bg-white px-3 py-3 text-sm outline-none focus:border-[#9d31ff]"
                    />
                  </label>

                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {filteredResources.length > 0 ? (
                      filteredResources.map((resource) => {
                        const isSelected = selectedResourceIds.includes(resource.id)
                        return (
                          <label
                            key={resource.id}
                            className={`flex cursor-pointer items-start gap-3 rounded-2xl border px-3 py-3 text-sm transition ${
                              isSelected ? 'border-[#9d31ff]/25 bg-[#f8faff]' : 'border-[#ece8f6] bg-white hover:bg-[#f8faff]'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleResourceSelection(resource.id)}
                              className="mt-0.5"
                            />
                            <div className="min-w-0 flex-1">
                              <div className="font-medium text-slate-900">{resource[resourceNameField]}</div>
                              <div className="text-xs text-slate-500">{resource[resourceEmailField]}</div>
                            </div>
                          </label>
                        )
                      })
                    ) : (
                      <div className="rounded-2xl border border-dashed border-[#ece8f6] bg-white px-3 py-4 text-sm text-slate-500">
                        {searchQuery ? `Sin resultados para "${searchQuery}"` : 'No hay registros disponibles'}
                      </div>
                    )}
                  </div>

                  {selectedResourceIds.length > 0 && (
                    <div className="rounded-2xl border border-[#9d31ff]/25 bg-[#f8faff] p-3">
                      <div className="text-xs font-semibold text-[#9d31ff]">Seleccionados</div>
                      <div className="mt-1 text-sm font-medium text-slate-900">{selectedResourceIds.length}</div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-center text-slate-500 h-full">
                  <div className="text-center">
                    <AlertCircle className="mx-auto h-8 w-8 mb-2 text-slate-400" />
                    <p className="text-sm">Selecciona un profesor para empezar</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Footer: Errors, success, and buttons */}
          <div className="border-t border-[#ece8f6] bg-[#fafafa] p-4 sm:px-6">
            {error && (
              <div className="mb-3 rounded-2xl border border-rose-200 bg-rose-50 px-3 py-3 text-sm text-rose-700">
                {error}
              </div>
            )}

            {success && (
              <div className="mb-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-3 text-sm text-emerald-700">
                ✓ {success}
              </div>
            )}

            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={onClose}
                className="rounded-2xl border border-[#ece8f6] bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-[#f8faff]"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={submitting || !selectedTeacherId || selectedResourceIds.length === 0}
                className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-[#9d31ff] to-[#ff318c] px-4 py-3 text-sm font-semibold text-white shadow-lg transition disabled:opacity-50 hover:brightness-110"
              >
                {submitting ? 'Asignando...' : 'Asignar'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
