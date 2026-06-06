export default function PageLoader({ message = 'Cargando...' }) {
  return (
    <div className="flex min-h-[calc(100svh-64px)] items-center justify-center px-4 py-6">
      <div className="rounded-3xl border border-[#ece8f6] bg-white px-8 py-7 text-sm text-slate-700 shadow-2xl">
        {message}
      </div>
    </div>
  )
}
