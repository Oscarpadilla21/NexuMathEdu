import { useMemo } from 'react'
import { Sparkles } from 'lucide-react'
import { computePerformanceMatrix } from '../../utils/courseAnalytics'

export default function PerformanceMatrixWidget({ records = [] }) {
  const matrix = useMemo(() => computePerformanceMatrix(records), [records])

  return (
    <div className="mt-4 rounded-[2rem] border border-[#ece8f6] bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between border-b border-[#ece8f6] pb-3">
        <div>
          <h4 className="text-base font-semibold text-slate-900">Matriz 2x2: Rendimiento vs Asistencia</h4>
          <p className="text-xs text-slate-500">Segmentación cuadrántica para intervención temprana</p>
        </div>
        <Sparkles className="h-4 w-4 text-purple-600" />
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {/* Cuadrante 1: Fortaleza */}
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">Fortaleza</span>
            <span className="rounded-full bg-emerald-200 px-2 py-0.5 text-xs font-bold text-emerald-900">{matrix.q1.length}</span>
          </div>
          <p className="mt-1 text-xs text-emerald-700">Alta nota (≥3.8) + Alta asis. (≥80%)</p>
        </div>

        {/* Cuadrante 2: Ausentismo */}
        <div className="rounded-2xl border border-blue-200 bg-blue-50/50 p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-blue-800 uppercase tracking-wider">Ausentismo Alerta</span>
            <span className="rounded-full bg-blue-200 px-2 py-0.5 text-xs font-bold text-blue-900">{matrix.q2.length}</span>
          </div>
          <p className="mt-1 text-xs text-blue-700">Alta nota (≥3.8) + Baja asis. (&lt;80%)</p>
        </div>

        {/* Cuadrante 3: Refuerzo Pedagógico */}
        <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-800 uppercase tracking-wider">Refuerzo Requerido</span>
            <span className="rounded-full bg-amber-200 px-2 py-0.5 text-xs font-bold text-amber-900">{matrix.q3.length}</span>
          </div>
          <p className="mt-1 text-xs text-amber-700">Baja nota (&lt;3.8) + Alta asis. (≥80%)</p>
        </div>

        {/* Cuadrante 4: Riesgo Crítico */}
        <div className="rounded-2xl border border-rose-200 bg-rose-50/50 p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-rose-800 uppercase tracking-wider">Riesgo Crítico</span>
            <span className="rounded-full bg-rose-200 px-2 py-0.5 text-xs font-bold text-rose-900">{matrix.q4.length}</span>
          </div>
          <p className="mt-1 text-xs text-rose-700">Baja nota (&lt;3.8) + Baja asis. (&lt;80%)</p>
        </div>
      </div>
    </div>
  )
}
