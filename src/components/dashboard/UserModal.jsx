export default function UserModal({
  open,
  title,
  description,
  user,
  onChange,
  roleOptions,
  onSubmit,
  onClose,
  submitting = false,
  submitLabel = 'Guardar',
}) {
  if (!open) return null

  const selectedRole = roleOptions.find((option) => option.value === user.role)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
      <div className="w-full max-w-md rounded-[2rem] bg-white p-6 shadow-2xl">
        <h2 className="text-xl font-bold text-slate-900">{title}</h2>
        {description ? <p className="mt-2 text-sm text-slate-500">{description}</p> : null}

        <form onSubmit={onSubmit} className="mt-5 space-y-3">
          <input
            type="email"
            value={user.email}
            onChange={(e) => onChange('email', e.target.value)}
            placeholder="Correo"
            className="w-full rounded-2xl border border-[#ece8f6] px-4 py-3 text-sm outline-none focus:border-[#9d31ff]/40"
            required
          />
          <input
            type="text"
            value={user.full_name}
            onChange={(e) => onChange('full_name', e.target.value)}
            placeholder="Nombre completo"
            className="w-full rounded-2xl border border-[#ece8f6] px-4 py-3 text-sm outline-none focus:border-[#9d31ff]/40"
            required
          />
          <input
            type="password"
            value={user.password}
            onChange={(e) => onChange('password', e.target.value)}
            placeholder="Contraseña"
            className="w-full rounded-2xl border border-[#ece8f6] px-4 py-3 text-sm outline-none focus:border-[#9d31ff]/40"
            required
          />

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
          ) : (
            <div className="rounded-2xl border border-dashed border-[#ece8f6] bg-[#fafafa] px-4 py-3 text-sm text-slate-600">
              Rol fijo: <span className="font-semibold text-slate-900">{selectedRole?.label || user.role}</span>
            </div>
          )}

          <div className="flex gap-2 pt-2">
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
