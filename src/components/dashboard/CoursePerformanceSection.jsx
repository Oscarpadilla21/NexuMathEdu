import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ApexCharts from 'apexcharts'
import {
  BarChart3,
  Bot,
  CheckCircle2,
  Download,
  Filter,
  LineChart,
  PieChart,
  ScatterChart,
  Sparkles,
  Table2,
  Target,
  TrendingUp,
  X,
  Zap,
} from 'lucide-react'
import {
  PASSING_GRADE,
  PERIOD_DEFINITIONS,
  buildCoursePerformanceCatalog,
  buildRadarComparisonData,
  computeNumericStats,
  computePerformanceMatrix,
  downloadCSV,
  formatDelta,
  formatScore,
  getAcademicPeriodLabel,
  getAttendanceValue,
  getGradeMetricValue,
} from '../../utils/courseAnalytics'

const CHART_OPTIONS = [
  { value: 'bar', label: 'Barras', icon: BarChart3 },
  { value: 'area', label: 'Líneas', icon: LineChart },
  { value: 'radar', label: 'Radar', icon: PieChart },
  { value: 'scatter', label: 'Dispersión', icon: ScatterChart },
  { value: 'table', label: 'Tabla', icon: Table2 },
]

const STUDENT_CHART_OPTIONS = [
  { value: 'bar', label: 'Barras', icon: BarChart3 },
  { value: 'area', label: 'Trayectoria', icon: LineChart },
  { value: 'scatter', label: 'Dispersión', icon: ScatterChart },
  { value: 'table', label: 'Tabla', icon: Table2 },
]

const METRIC_OPTIONS = [
  { value: 'final_grade', label: 'Nota final' },
  { value: 'note_1', label: 'P1' },
  { value: 'note_2', label: 'P2' },
  { value: 'note_3', label: 'P3' },
  { value: 'attendance', label: 'Asistencia' },
]

const CHART_COLORS = ['#9d31ff', '#ff318c', '#14b8a6', '#f59e0b', '#2563eb', '#ef4444']

export default function CoursePerformanceSection({
  title = 'Rendimiento por curso',
  description = 'Explora promedio general, aprobados y variación frente al periodo anterior.',
  courses = [],
  enrollments = [],
  students = [],
  courseGrades = [],
  emptyMessage = 'Todavía no hay cursos con datos suficientes para analizar.',
  scopeLabel = '',
}) {
  const catalog = useMemo(
    () => buildCoursePerformanceCatalog({ courses, enrollments, students, courseGrades }),
    [courses, enrollments, students, courseGrades]
  )
  const [activeCourseId, setActiveCourseId] = useState(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [analysisMode, setAnalysisMode] = useState('courses')
  const [courseChartType, setCourseChartType] = useState('bar')
  const [studentChartType, setStudentChartType] = useState('bar')

  useEffect(() => {
    if (!activeCourseId && catalog.courses.length > 0) {
      setActiveCourseId(catalog.courses[0]?.id || null)
    }
  }, [activeCourseId, catalog.courses])

  const activeCourse = isModalOpen ? catalog.courses.find((item) => item.id === activeCourseId) || null : null

  const openCourseAnalysis = (courseId) => {
    setActiveCourseId(courseId)
    setAnalysisMode('courses')
    setCourseChartType('bar')
    setStudentChartType('bar')
    setIsModalOpen(true)
  }

  return (
    <section className="overflow-hidden rounded-[2rem] border border-[#ece8f6] bg-white shadow-2xl">
      <div className="flex flex-col gap-3 border-b border-[#ece8f6] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
            {scopeLabel ? (
              <span className="rounded-full bg-[#f8faff] px-2.5 py-1 text-[11px] font-semibold text-slate-500">{scopeLabel}</span>
            ) : null}
            <span className="rounded-full bg-purple-100 px-2.5 py-1 text-[11px] font-bold text-purple-700">Nivel Macro: Analítica Descriptiva y Predictiva</span>
          </div>
          <p className="text-sm text-slate-500">{description}</p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-2xl border border-[#ece8f6] bg-[#fafafa] px-3 py-2 text-xs font-semibold text-slate-600">
          <Filter className="h-4 w-4" />
          {catalog.periodOptions.length > 0 ? `${catalog.periodOptions.length} periodos detectados` : 'Sin periodos detectados'}
        </div>
      </div>

      {/* Panel Resumen de Nivel Macro (Analítica Descriptiva y Predictiva) */}
      {catalog.macroSummary && (
        <div className="border-b border-[#ece8f6] bg-gradient-to-r from-purple-50/50 via-slate-50 to-pink-50/30 p-5 sm:p-6">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#9d31ff]">
            Panel Macro-Analítico Consolidado
          </p>
          <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* 1. Patrones de Rendimiento */}
            <div className="rounded-2xl border border-purple-100 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Patrones de Rendimiento</span>
                <span className="rounded-full bg-purple-50 p-1.5 text-purple-600">📊</span>
              </div>
              <p className="mt-2 text-2xl font-bold text-slate-900">{catalog.macroSummary.averageFinalGrade}</p>
              <p className="mt-1 text-xs text-slate-500">
                Promedio general • <strong className="text-emerald-600">{catalog.macroSummary.passingRate}% aprobados</strong>
              </p>
            </div>

            {/* 2. Tendencias Temporales */}
            <div className="rounded-2xl border border-blue-100 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tendencias Temporales</span>
                <span className="rounded-full bg-blue-50 p-1.5 text-blue-600">📈</span>
              </div>
              <p className="mt-2 text-2xl font-bold text-slate-900">P1 ➔ P2 ➔ P3</p>
              <p className="mt-1 text-xs text-slate-500">
                Seguimiento continuo de evolución por periodo escolar
              </p>
            </div>

            {/* 3. Segmentos de Riesgo */}
            <div className="rounded-2xl border border-rose-100 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Segmentos de Riesgo</span>
                <span className="rounded-full bg-rose-50 p-1.5 text-rose-600">⚠️</span>
              </div>
              <div className="mt-2 flex items-center gap-2">
                <span className="rounded-md bg-rose-100 px-2 py-0.5 text-xs font-bold text-rose-700">
                  {catalog.macroSummary.riskSegments.high} Alto
                </span>
                <span className="rounded-md bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-700">
                  {catalog.macroSummary.riskSegments.medium} Medio
                </span>
                <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-700">
                  {catalog.macroSummary.riskSegments.low} Bajo
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-500">Clasificación predictiva para alerta temprana</p>
            </div>

            {/* 4. Variables Asociadas */}
            <div className="rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Variables de Desempeño</span>
                <span className="rounded-full bg-emerald-50 p-1.5 text-emerald-600">🔍</span>
              </div>
              <p className="mt-2 text-sm font-bold text-slate-800">Asistencia + Tutoría Micro</p>
              <p className="mt-1 text-xs text-slate-500">Factores correlacionados al resultado académico</p>
            </div>
          </div>
        </div>
      )}

      {catalog.courses.length > 0 ? (
        <div className="grid gap-4 p-5 sm:p-6 lg:grid-cols-2 xl:grid-cols-3">
          {catalog.courses.map((course) => (
            <article
              key={course.id}
              className="flex flex-col justify-between rounded-3xl border border-[#ece8f6] bg-[#f8faff] p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#9d31ff]">
                      {course.subject || 'Sin materia'}
                    </p>
                    <h3 className="mt-2 text-lg font-semibold text-slate-900">{course.title}</h3>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                      course.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {course.is_active ? 'Activo' : 'Inactivo'}
                  </span>
                </div>

                <p className="mt-3 text-sm leading-6 text-slate-600">{course.description || 'Sin descripción.'}</p>

                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <MetricPill label="Promedio" value={formatScore(course.average_final)} tone="violet" />
                  <MetricPill label="Aprobados" value={`${course.approved_count}/${course.total_students || 0}`} tone="rose" />
                  <MetricPill
                    label="Mejora"
                    value={course.improvement_from_previous_period === null ? 'Sin histórico' : formatDelta(course.improvement_from_previous_period)}
                    tone={course.improvement_from_previous_period === null ? 'slate' : course.improvement_from_previous_period >= 0 ? 'emerald' : 'slate'}
                  />
                </div>

                {/* Badges de Segmentos de Riesgo por Curso */}
                {course.risk_segments && (
                  <div className="mt-3 flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-200/60 text-xs">
                    <span className="text-[11px] font-medium text-slate-400">Riesgo:</span>
                    <span className="rounded-full bg-rose-100/80 px-2 py-0.5 text-[11px] font-bold text-rose-700">
                      {course.risk_segments.high} Alto
                    </span>
                    <span className="rounded-full bg-amber-100/80 px-2 py-0.5 text-[11px] font-bold text-amber-700">
                      {course.risk_segments.medium} Medio
                    </span>
                    <span className="rounded-full bg-emerald-100/80 px-2 py-0.5 text-[11px] font-bold text-emerald-700">
                      {course.risk_segments.low} Bajo
                    </span>
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() => openCourseAnalysis(course.id)}
                className="mt-5 inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#9d31ff] to-[#ff318c] px-4 py-3 text-sm font-semibold text-white shadow-lg transition hover:brightness-110"
              >
                <TrendingUp className="h-4 w-4" />
                Ver analítica detallada del curso
              </button>
            </article>
          ))}
        </div>
      ) : (
        <div className="px-5 py-10 text-sm text-slate-500 sm:px-6">{emptyMessage}</div>
      )}

      <CoursePerformanceModal
        open={isModalOpen && !!activeCourse}
        course={activeCourse}
        catalog={catalog}
        analysisMode={analysisMode}
        onModeChange={setAnalysisMode}
        onClose={() => setIsModalOpen(false)}
      />
    </section>
  )
}

function CoursePerformanceModal({ open, course, catalog, analysisMode, onModeChange, onClose }) {
  const [selectedCourseIds, setSelectedCourseIds] = useState([])
  const [selectedStudentIds, setSelectedStudentIds] = useState([])
  const [chartType, setChartType] = useState('bar')
  const [courseChartType, setCourseChartType] = useState('bar')
  const [studentChartType, setStudentChartType] = useState('bar')
  const [selectedGroup, setSelectedGroup] = useState('all')
  const [evaluationMetric, setEvaluationMetric] = useState('final_grade')
  const [noteRangeMin, setNoteRangeMin] = useState('')
  const [noteRangeMax, setNoteRangeMax] = useState('')
  const [selectedPeriodKeys, setSelectedPeriodKeys] = useState(PERIOD_DEFINITIONS.map((period) => period.key))
  const [studentSearchQuery, setStudentSearchQuery] = useState('')
  const wasOpenRef = useRef(false)

  useEffect(() => {
    // Solo resetear cuando el modal se abre por primera vez
    if (!open) {
      wasOpenRef.current = false
      return
    }

    if (!wasOpenRef.current && open && course) {
      wasOpenRef.current = true
      const firstStudentId = course.records?.[0]?.student_id || null
      setSelectedCourseIds([course.id])
      setSelectedStudentIds(firstStudentId ? [firstStudentId] : [])
      setChartType('bar')
      setCourseChartType('bar')
      setStudentChartType('bar')
      setSelectedGroup('all')
      setEvaluationMetric('final_grade')
      setNoteRangeMin('')
      setNoteRangeMax('')
      setSelectedPeriodKeys(PERIOD_DEFINITIONS.map((period) => period.key))
      setStudentSearchQuery('')
      onModeChange('courses')
    }
  }, [open, course, onModeChange])

  if (!open || !course) return null

  const activeView = analysisMode === 'students' ? 'students' : 'courses'
  const courseRecords = course.records || []
  const studentRecords =
    courseRecords.length > 0
      ? courseRecords
      : Array.isArray(course.students)
        ? course.students.map((student) => ({
            student_id: student.student_id || student.id || '',
            student_name: student.student_name || student.full_name || student.email || 'Sin nombre',
            student_email: student.student_email || student.email || '',
            course_id: course.id,
            course_title: course.title,
            course_subject: course.subject,
            course_grade_level: course.grade_level,
            note_1: student.note_1 ?? null,
            note_2: student.note_2 ?? null,
            note_3: student.note_3 ?? null,
            final_grade: student.final_grade ?? null,
            attendance: student.attendance ?? null,
          }))
        : []
  const selectedCourses =
    activeView === 'courses' ? catalog.courses.filter((item) => selectedCourseIds.includes(item.id)) : [course]

  const filteredCourseRecords = (activeView === 'courses' ? selectedCourses.flatMap((item) => item.records || []) : courseRecords).filter((record) => {
    if (selectedGroup !== 'all' && (record.course_grade_level || 'Sin grupo') !== selectedGroup) {
      return false
    }

    const metricValue = getGradeMetricValue(record, evaluationMetric)
    const minValue = noteRangeMin === '' ? null : Number(noteRangeMin)
    const maxValue = noteRangeMax === '' ? null : Number(noteRangeMax)

    if (minValue !== null && Number.isFinite(minValue) && metricValue < minValue) {
      return false
    }

    if (maxValue !== null && Number.isFinite(maxValue) && metricValue > maxValue) {
      return false
    }

    return true
  })

  const courseMetricStats = computeNumericStats(filteredCourseRecords.map((record) => getGradeMetricValue(record, evaluationMetric)))
  const courseAverageFinal = computeNumericStats(filteredCourseRecords.map((record) => record.final_grade))
  const courseApproved = filteredCourseRecords.filter((record) => Number(record.final_grade || 0) >= PASSING_GRADE).length

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-3 sm:p-4">
      <div className="flex h-[92svh] w-full max-w-7xl flex-col overflow-hidden rounded-[2rem] border border-white/10 bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-[#ece8f6] px-5 py-4 sm:px-6">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-[#9d31ff]">Análisis detallado</p>
            <h3 className="mt-2 text-2xl font-semibold text-slate-900">{course.title}</h3>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
              {activeView === 'students'
                ? 'Selecciona alumnos para ver sus notas lado a lado y comparar rendimiento.'
                : 'Selecciona cursos para comparar sus promedios generales uno al lado del otro.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-2 rounded-2xl border border-[#ece8f6] bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-[#f8faff]"
          >
            <X className="h-4 w-4" />
            Cerrar
          </button>
        </div>
        <div className="border-b border-[#ece8f6] bg-[#fafafa] px-5 py-3 sm:px-6">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => onModeChange('courses')}
              className={`rounded-2xl px-4 py-2 text-sm font-semibold transition ${
                activeView === 'courses' ? 'bg-[#9d31ff] text-white shadow-lg' : 'border border-[#ece8f6] bg-white text-slate-700 hover:bg-[#f8faff]'
              }`}
            >
              Comparar cursos
            </button>
            <button
              type="button"
              onClick={() => onModeChange('students')}
              className={`rounded-2xl px-4 py-2 text-sm font-semibold transition ${
                activeView === 'students' ? 'bg-[#9d31ff] text-white shadow-lg' : 'border border-[#ece8f6] bg-white text-slate-700 hover:bg-[#f8faff]'
              }`}
            >
              Comparar alumnos
            </button>
          </div>
        </div>

        {activeView === 'courses' ? (
          <CourseComparisonView
            activeCourse={course}
            catalog={catalog}
            selectedCourseIds={selectedCourseIds}
            setSelectedCourseIds={setSelectedCourseIds}
            chartType={courseChartType}
            setChartType={setCourseChartType}
            selectedGroup={selectedGroup}
            setSelectedGroup={setSelectedGroup}
            evaluationMetric={evaluationMetric}
            setEvaluationMetric={setEvaluationMetric}
            noteRangeMin={noteRangeMin}
            setNoteRangeMin={setNoteRangeMin}
            noteRangeMax={noteRangeMax}
            setNoteRangeMax={setNoteRangeMax}
            selectedPeriodKeys={selectedPeriodKeys}
            setSelectedPeriodKeys={setSelectedPeriodKeys}
            courseMetricStats={courseMetricStats}
            courseAverageFinal={courseAverageFinal}
            courseApproved={courseApproved}
            filteredCourseRecords={filteredCourseRecords}
            selectedCourses={selectedCourses}
          />
        ) : (
          <StudentPerformanceView
            course={course}
            studentRecords={studentRecords}
            selectedStudentIds={selectedStudentIds}
            setSelectedStudentIds={setSelectedStudentIds}
            studentSearchQuery={studentSearchQuery}
            setStudentSearchQuery={setStudentSearchQuery}
            chartType={studentChartType}
            setChartType={setStudentChartType}
            selectedGroup={selectedGroup}
            setSelectedGroup={setSelectedGroup}
            evaluationMetric={evaluationMetric}
            setEvaluationMetric={setEvaluationMetric}
            noteRangeMin={noteRangeMin}
            setNoteRangeMin={setNoteRangeMin}
            noteRangeMax={noteRangeMax}
            setNoteRangeMax={setNoteRangeMax}
            selectedPeriodKeys={selectedPeriodKeys}
            setSelectedPeriodKeys={setSelectedPeriodKeys}
          />
        )}
      </div>
    </div>
  )
}

function CourseComparisonView({
  activeCourse,
  catalog,
  selectedCourseIds,
  setSelectedCourseIds,
  chartType,
  setChartType,
  selectedGroup,
  setSelectedGroup,
  evaluationMetric,
  setEvaluationMetric,
  noteRangeMin,
  setNoteRangeMin,
  noteRangeMax,
  setNoteRangeMax,
  selectedPeriodKeys,
  setSelectedPeriodKeys,
  courseMetricStats,
  courseAverageFinal,
  courseApproved,
  filteredCourseRecords,
  selectedCourses,
}) {
  useEffect(() => {
    if (selectedCourseIds.length === 0 && catalog.courses.length > 0) {
      const initialId = activeCourse?.id || catalog.courses[0].id
      setSelectedCourseIds([initialId])
    }
  }, [activeCourse, catalog.courses, selectedCourseIds, setSelectedCourseIds])

  const chartData = useMemo(() => buildComparisonChartData({ chartType, selectedCourses, selectedPeriodKeys, filteredCourseRecords }), [
    chartType,
    selectedCourses,
    selectedPeriodKeys,
    filteredCourseRecords,
  ])
  const chartOptions = useMemo(
    () => buildComparisonChartOptions(chartData, chartType, selectedPeriodKeys),
    [chartData, chartType, selectedPeriodKeys]
  )

  const handleExportCoursesCSV = () => {
    const headers = [
      'ID Curso',
      'Título',
      'Materia',
      'Grado',
      'Promedio General',
      'Mediana',
      'Aprobados',
      'Total Alumnos',
      'Riesgo Alto',
      'Riesgo Medio',
      'Bajo Riesgo',
    ]
    const rows = selectedCourses.map((c) => [
      c.id,
      c.title,
      c.subject,
      c.grade_level || '',
      c.average_final,
      c.median_final,
      c.approved_count,
      c.total_students,
      c.risk_segments?.high || 0,
      c.risk_segments?.medium || 0,
      c.risk_segments?.low || 0,
    ])
    downloadCSV(`reporte_cursos_${new Date().toISOString().slice(0, 10)}.csv`, headers, rows)
  }

  const selectCoursesInRisk = () => {
    const riskCourseIds = catalog.courses.filter((c) => (c.risk_segments?.high || 0) > 0).map((c) => c.id)
    if (riskCourseIds.length > 0) setSelectedCourseIds(riskCourseIds)
  }

  const selectSameGradeCourses = () => {
    const targetGrade = activeCourse?.grade_level || catalog.courses.find((c) => c.id === selectedCourseIds[0])?.grade_level
    if (targetGrade) {
      const sameGradeIds = catalog.courses.filter((c) => c.grade_level === targetGrade).map((c) => c.id)
      if (sameGradeIds.length > 0) setSelectedCourseIds(sameGradeIds)
    }
  }

  return (
    <div className="grid min-h-0 flex-1 gap-0 lg:grid-cols-[340px_1fr]">
      <aside className="min-h-0 overflow-y-auto border-b border-[#ece8f6] bg-[#fafafa] p-4 lg:border-b-0 lg:border-r">
        <div className="space-y-4">
          <PanelCard title="Acciones y Presets">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={selectCoursesInRisk}
                className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 transition"
              >
                <Zap className="h-3.5 w-3.5" />
                Cursos en Riesgo
              </button>
              <button
                type="button"
                onClick={selectSameGradeCourses}
                className="inline-flex items-center gap-1.5 rounded-xl border border-purple-200 bg-purple-50 px-2.5 py-1.5 text-xs font-semibold text-purple-700 hover:bg-purple-100 transition"
              >
                <Target className="h-3.5 w-3.5" />
                Mismo Grado
              </button>
              <button
                type="button"
                onClick={handleExportCoursesCSV}
                className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 transition"
              >
                <Download className="h-3.5 w-3.5" />
                Exportar CSV
              </button>
            </div>
          </PanelCard>

          <PanelCard title="Cursos comparados">
            <div className="space-y-2">
              {catalog.courses.map((item) => {
                const checked = selectedCourseIds.includes(item.id)

                return (
                  <label
                    key={item.id}
                    className={`flex cursor-pointer items-start gap-3 rounded-2xl border px-3 py-3 text-sm transition ${
                      checked ? 'border-[#9d31ff]/25 bg-[#f8faff]' : 'border-[#ece8f6] bg-white hover:bg-[#f8faff]'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() =>
                        setSelectedCourseIds((current) =>
                          current.includes(item.id) ? current.filter((id) => id !== item.id) : [...current, item.id]
                        )
                      }
                      className="mt-1"
                    />
                    <span className="min-w-0">
                      <span className="block font-medium text-slate-900">{item.title}</span>
                      <span className="block text-xs text-slate-500">
                        {item.subject || 'Sin materia'}
                        {item.grade_level ? ` - ${item.grade_level}` : ''}
                      </span>
                    </span>
                  </label>
                )
              })}
            </div>
          </PanelCard>

          <PanelCard title="Tipo de gráfico">
            <div className="grid grid-cols-2 gap-2">
              {CHART_OPTIONS.map((option) => {
                const Icon = option.icon
                const active = chartType === option.value
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setChartType(option.value)}
                    className={`inline-flex items-center justify-center gap-2 rounded-2xl border px-3 py-3 text-sm font-semibold transition ${
                      active
                        ? 'border-[#9d31ff]/30 bg-[#f8faff] text-[#9d31ff]'
                        : 'border-[#ece8f6] bg-white text-slate-700 hover:bg-[#f8faff]'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {option.label}
                  </button>
                )
              })}
            </div>
          </PanelCard>

          <PanelCard title="Filtros">
            <div className="space-y-3">
              <label className="block">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">Grupo / grado</span>
                <select
                  value={selectedGroup}
                  onChange={(e) => setSelectedGroup(e.target.value)}
                  className="w-full rounded-2xl border border-[#ece8f6] bg-white px-3 py-3 text-sm outline-none"
                >
                  <option value="all">Todos</option>
                  {catalog.groupOptions.map((group) => (
                    <option key={group} value={group}>
                      {group}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">Tipo de evaluación</span>
                <select
                  value={evaluationMetric}
                  onChange={(e) => setEvaluationMetric(e.target.value)}
                  className="w-full rounded-2xl border border-[#ece8f6] bg-white px-3 py-3 text-sm outline-none"
                >
                  {METRIC_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">Nota min.</span>
                  <input
                    type="number"
                    min="0"
                    max="5"
                    step="0.01"
                    value={noteRangeMin}
                    onChange={(e) => setNoteRangeMin(e.target.value)}
                    placeholder="0.00"
                    className="w-full rounded-2xl border border-[#ece8f6] bg-white px-3 py-3 text-sm outline-none"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">Nota max.</span>
                  <input
                    type="number"
                    min="0"
                    max="5"
                    step="0.01"
                    value={noteRangeMax}
                    onChange={(e) => setNoteRangeMax(e.target.value)}
                    placeholder="5.00"
                    className="w-full rounded-2xl border border-[#ece8f6] bg-white px-3 py-3 text-sm outline-none"
                  />
                </label>
              </div>
            </div>
          </PanelCard>

          <PanelCard title="Periodos">
            <div className="space-y-2">
              {PERIOD_DEFINITIONS.map((period) => {
                const checked = selectedPeriodKeys.includes(period.key)
                return (
                  <label
                    key={period.key}
                    className={`flex cursor-pointer items-center justify-between gap-3 rounded-2xl border px-3 py-3 text-sm transition ${
                      checked ? 'border-[#9d31ff]/25 bg-[#f8faff]' : 'border-[#ece8f6] bg-white hover:bg-[#f8faff]'
                    }`}
                  >
                    <span>{period.label}</span>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() =>
                        setSelectedPeriodKeys((current) =>
                          current.includes(period.key) ? current.filter((key) => key !== period.key) : [...current, period.key]
                        )
                      }
                    />
                  </label>
                )
              })}
            </div>
          </PanelCard>
        </div>
      </aside>

      <div className="min-h-0 overflow-y-auto p-4 sm:p-6">
        <div className="grid gap-4 md:grid-cols-4">
          <SummaryCard label="Promedio filtrado" value={formatScore(courseAverageFinal.average)} helper={`Mediana: ${formatScore(courseAverageFinal.median)}`} />
          <SummaryCard label="Aprobados" value={`${courseApproved}/${filteredCourseRecords.length}`} helper={`P75: ${formatScore(courseAverageFinal.p75)}`} />
          <SummaryCard
            label="Evaluación"
            value={METRIC_OPTIONS.find((item) => item.value === evaluationMetric)?.label || 'Nota final'}
            helper={`Desv. est.: ${formatScore(courseMetricStats.stdDev)}`}
          />
          <SummaryCard
            label="Periodos activos"
            value={selectedPeriodKeys.length || 0}
            helper={selectedPeriodKeys.map((period) => getAcademicPeriodLabel(period)).join(', ') || 'Todos desactivados'}
          />
        </div>

        {selectedCourses.length >= 2 && (
          <CourseComparisonTable courses={selectedCourses} />
        )}

        <div className="mt-4 rounded-[2rem] border border-[#ece8f6] bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-3 border-b border-[#ece8f6] pb-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h4 className="text-base font-semibold text-slate-900">
                {chartType === 'bar'
                  ? 'Comparación por periodos'
                  : chartType === 'area'
                    ? 'Evolución temporal'
                    : chartType === 'scatter'
                      ? 'Relación entre variables'
                      : 'Datos detallados'}
              </h4>
              <p className="text-sm text-slate-500">Usa los controles del gráfico para acercar, alejar y explorar los datos.</p>
            </div>
            <div className="inline-flex items-center gap-2 rounded-2xl bg-[#f8faff] px-3 py-2 text-xs font-semibold text-slate-500">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              {filteredCourseRecords.length} registro(s) filtrado(s)
            </div>
          </div>

          <div className="mt-4">
            {chartType === 'table' ? (
              <DataTableView records={filteredCourseRecords} />
            ) : chartType === 'bar' ? (
              <SimpleBarChart series={chartData.series} categories={chartData.categories} height={360} />
            ) : (
            <ApexChartPanel
              type={chartType}
              options={chartOptions}
              series={chartData.series}
              height={440}
            />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function CourseComparisonTable({ courses }) {
  const rows = [
    { key: 'average_final', label: 'Promedio General' },
    { key: 'median_final', label: 'Mediana' },
    { key: 'p75_final', label: 'P75' },
    { key: 'std_final', label: 'Desv. estándar' },
    { key: 'approved_count', label: 'Aprobados' },
    { key: 'total_students', label: 'Total Alumnos' },
  ]

  return (
    <div className="mt-4 overflow-hidden rounded-[2rem] border border-[#ece8f6] bg-white shadow-sm">
      <div className="border-b border-[#ece8f6] bg-[#f8faff] px-5 py-3">
        <h4 className="text-sm font-semibold text-slate-900">Comparación de promedios generales</h4>
        <p className="text-xs text-slate-500">Promedio general de cada curso lado a lado</p>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-[#fafafa]">
            <tr className="text-xs uppercase tracking-[0.16em] text-slate-400">
              <th className="px-5 py-3 font-semibold">Métrica</th>
              {courses.map((course) => (
                <th key={course.id} className="px-5 py-3 font-semibold text-center">{course.title}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#ece8f6]">
            {rows.map((row) => (
              <tr key={row.key} className="hover:bg-[#f8faff]">
                <td className="px-5 py-3 font-medium text-slate-700">{row.label}</td>
                {courses.map((course) => {
                  const value = course[row.key]
                  const isNumeric = typeof value === 'number'
                  return (
                    <td key={course.id} className="px-5 py-3 text-center font-semibold text-slate-900">
                      {isNumeric ? formatScore(value) : value ?? '-'}
                    </td>
                  )
                })}
              </tr>
            ))}
            <tr className="bg-[#f0fdf4] hover:bg-[#f0fdf4]">
              <td className="px-5 py-3 font-medium text-emerald-800">Tasa de aprobación</td>
              {courses.map((course) => {
                const rate = course.total_students > 0 ? ((course.approved_count / course.total_students) * 100) : 0
                return (
                  <td key={course.id} className="px-5 py-3 text-center font-bold text-emerald-700">
                    {formatScore(rate)}%
                  </td>
                )
              })}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}

function StudentPerformanceView({
  course,
  studentRecords,
  selectedStudentIds,
  setSelectedStudentIds,
  studentSearchQuery,
  setStudentSearchQuery,
  chartType,
  setChartType,
  selectedGroup,
  setSelectedGroup,
  evaluationMetric,
  setEvaluationMetric,
  noteRangeMin,
  setNoteRangeMin,
  noteRangeMax,
  setNoteRangeMax,
  selectedPeriodKeys,
  setSelectedPeriodKeys,
}) {
  const selectedMetricLabel = METRIC_OPTIONS.find((item) => item.value === evaluationMetric)?.label || 'Nota final'
  
  const studentCards = [...studentRecords].sort((a, b) => {
    const metricDelta = getGradeMetricValue(b, evaluationMetric) - getGradeMetricValue(a, evaluationMetric)
    if (metricDelta !== 0) return metricDelta
    return Number(b.final_grade || 0) - Number(a.final_grade || 0)
  })
  
  const filteredCards = studentCards.filter((record) => {
    // Filtro por nivel de riesgo
    if (selectedGroup !== 'all') {
      const riskLevel = record.risk?.level || 'bajo'
      if (selectedGroup === 'alto' && riskLevel !== 'alto') return false
      if (selectedGroup === 'medio' && riskLevel !== 'medio') return false
      if (selectedGroup === 'bajo' && riskLevel !== 'bajo') return false
    }

    // Filtro por rango de nota
    const metricValue = getGradeMetricValue(record, evaluationMetric)
    const minValue = noteRangeMin === '' ? null : Number(noteRangeMin)
    const maxValue = noteRangeMax === '' ? null : Number(noteRangeMax)

    if (minValue !== null && Number.isFinite(minValue) && metricValue < minValue) {
      return false
    }

    if (maxValue !== null && Number.isFinite(maxValue) && metricValue > maxValue) {
      return false
    }

    // Filtro por búsqueda de texto
    const searchLower = studentSearchQuery.toLowerCase()
    if (searchLower) {
      const name = (record.student_name || '').toLowerCase()
      const email = (record.student_email || '').toLowerCase()
      if (!name.includes(searchLower) && !email.includes(searchLower)) {
        return false
      }
    }

    return true
  })

  // Obtener estudiantes seleccionados
  const selectedStudents = filteredCards.filter((r) => selectedStudentIds.includes(r.student_id))
  
  const toggleStudentSelection = (studentId) => {
    setSelectedStudentIds((current) => {
      if (current.includes(studentId)) {
        return current.filter((id) => id !== studentId)
      } else {
        if (current.length >= 4) {
          return [...current.slice(1), studentId]
        }
        return [...current, studentId]
      }
    })
  }

  // Gráficos para alumnos seleccionados
  const comparisonChartData = useMemo(() => {
    if (selectedStudents.length === 0) {
      return { series: [] }
    }

    const labels = selectedPeriodKeys.map((periodKey) => getAcademicPeriodLabel(periodKey))
    const series = selectedStudents.map((student) => ({
      name: student.student_name,
      data: selectedPeriodKeys.map((periodKey) => getGradeMetricValue(student, periodKey)),
    }))

    return { series, categories: labels }
  }, [selectedStudents, selectedPeriodKeys])

  const comparisonChartOptions = useMemo(
    () => buildStudentChartOptions(comparisonChartData, chartType),
    [comparisonChartData, chartType]
  )

  const filteredMetricStats = computeNumericStats(filteredCards.map((record) => getGradeMetricValue(record, evaluationMetric)))

  const handleExportStudentsCSV = () => {
    const headers = ['ID Alumno', 'Nombre', 'Correo', 'Curso', 'P1', 'P2', 'P3', 'Nota Final', 'Asistencia', 'Nivel de Riesgo', 'Motivo de Riesgo']
    const rows = (selectedStudents.length > 0 ? selectedStudents : studentRecords).map((r) => [
      r.student_id,
      r.student_name,
      r.student_email,
      r.course_title,
      r.note_1,
      r.note_2,
      r.note_3,
      r.final_grade,
      getAttendanceValue(r) !== null ? getAttendanceValue(r) + '%' : '100%',
      r.risk?.label || 'Sin clasificar',
      r.risk?.reason || '',
    ])
    downloadCSV(`reporte_alumnos_${new Date().toISOString().slice(0, 10)}.csv`, headers, rows)
  }

  const selectHighRiskStudents = () => {
    const highRiskIds = studentRecords.filter((r) => r.risk?.level === 'alto').slice(0, 4).map((r) => r.student_id)
    if (highRiskIds.length > 0) setSelectedStudentIds(highRiskIds)
  }

  const selectTopStudents = () => {
    const topIds = [...studentRecords]
      .sort((a, b) => Number(b.final_grade || 0) - Number(a.final_grade || 0))
      .slice(0, 3)
      .map((r) => r.student_id)
    setSelectedStudentIds(topIds)
  }

  const clearSelection = () => setSelectedStudentIds([])

  return (
    <div className="grid min-h-0 flex-1 gap-0 lg:grid-cols-[380px_1fr]">
      <aside className="min-h-0 overflow-y-auto border-b border-[#ece8f6] bg-[#fafafa] p-4 lg:border-b-0 lg:border-r">
        <div className="space-y-4">
          <PanelCard title="Acciones y Presets">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={selectHighRiskStudents}
                className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 transition"
              >
                <Zap className="h-3.5 w-3.5" />
                Riesgo Alto
              </button>
              <button
                type="button"
                onClick={selectTopStudents}
                className="inline-flex items-center gap-1.5 rounded-xl border border-purple-200 bg-purple-50 px-2.5 py-1.5 text-xs font-semibold text-purple-700 hover:bg-purple-100 transition"
              >
                <Sparkles className="h-3.5 w-3.5" />
                Top 3
              </button>
              <button
                type="button"
                onClick={clearSelection}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
              >
                <X className="h-3.5 w-3.5" />
                Limpiar
              </button>
              <button
                type="button"
                onClick={handleExportStudentsCSV}
                className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 transition"
              >
                <Download className="h-3.5 w-3.5" />
                Exportar CSV
              </button>
            </div>
          </PanelCard>

          <PanelCard title="Buscar alumnos">
            <input
              type="text"
              placeholder="Nombre o correo..."
              value={studentSearchQuery}
              onChange={(e) => setStudentSearchQuery(e.target.value)}
              className="w-full rounded-2xl border border-[#ece8f6] bg-white px-3 py-3 text-sm outline-none focus:border-[#9d31ff]"
            />
            {studentSearchQuery && (
              <button
                onClick={() => setStudentSearchQuery('')}
                className="mt-2 w-full rounded-2xl border border-[#ece8f6] bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-[#f8faff]"
              >
                Limpiar búsqueda
              </button>
            )}
          </PanelCard>

          <PanelCard title={`Alumnos (${filteredCards.length})`}>
            <p className="mb-2 text-xs text-slate-400">Selecciona hasta 4 para comparar lado a lado</p>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {filteredCards.length > 0 ? (
                filteredCards.map((record, index) => {
                  const isSelected = selectedStudentIds.includes(record.student_id)
                  const attendance = getAttendanceValue(record)
                  return (
                    <label
                      key={record.student_id}
                      className={`flex cursor-pointer items-start gap-3 rounded-2xl border px-3 py-3 text-sm transition ${
                        isSelected ? 'border-[#9d31ff]/25 bg-[#f8faff]' : 'border-[#ece8f6] bg-white hover:bg-[#f8faff]'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleStudentSelection(record.student_id)}
                        disabled={!isSelected && selectedStudentIds.length >= 4}
                        className="mt-0.5"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400">#{index + 1}</div>
                        <div className="truncate font-medium text-slate-900">{record.student_name}</div>
                        <div className="truncate text-xs text-slate-500">{record.student_email}</div>
                        <div className="mt-2 grid grid-cols-4 gap-2">
                          <MetricPill label="P1" value={formatScore(record.note_1)} tone="violet" />
                          <MetricPill label="P2" value={formatScore(record.note_2)} tone="rose" />
                          <MetricPill label="P3" value={formatScore(record.note_3)} tone="emerald" />
                          <MetricPill label="Asis." value={formatScore(attendance)} tone="slate" />
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-semibold text-emerald-700">{formatScore(getGradeMetricValue(record, evaluationMetric))}</div>
                        <div className="text-xs text-slate-400">{selectedMetricLabel}</div>
                      </div>
                    </label>
                  )
                })
              ) : (
                <div className="rounded-2xl border border-dashed border-[#ece8f6] bg-white px-3 py-4 text-sm text-slate-500">
                  {studentSearchQuery ? 'Sin resultados en la búsqueda.' : 'Este curso no tiene estudiantes inscritos.'}
                </div>
              )}
            </div>
          </PanelCard>

          <PanelCard title="Filtros">
            <div className="space-y-3">
              <label className="block">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">Filtrar por nivel de riesgo</span>
                <select
                  value={selectedGroup}
                  onChange={(e) => setSelectedGroup(e.target.value)}
                  className="w-full rounded-2xl border border-[#ece8f6] bg-white px-3 py-3 text-sm outline-none font-medium text-slate-800"
                >
                  <option value="all">Todos los alumnos ({studentRecords.length})</option>
                  <option value="alto">🔴 Solo Riesgo Alto</option>
                  <option value="medio">🟡 Solo Riesgo Medio</option>
                  <option value="bajo">🟢 Solo Riesgo Bajo</option>
                </select>
              </label>

              <label className="block">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">Tipo de evaluación</span>
                <select
                  value={evaluationMetric}
                  onChange={(e) => setEvaluationMetric(e.target.value)}
                  className="w-full rounded-2xl border border-[#ece8f6] bg-white px-3 py-3 text-sm outline-none"
                >
                  {METRIC_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">Nota min.</span>
                  <input
                    type="number"
                    min="0"
                    max="5"
                    step="0.01"
                    value={noteRangeMin}
                    onChange={(e) => setNoteRangeMin(e.target.value)}
                    placeholder="0.00"
                    className="w-full rounded-2xl border border-[#ece8f6] bg-white px-3 py-3 text-sm outline-none"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">Nota max.</span>
                  <input
                    type="number"
                    min="0"
                    max="5"
                    step="0.01"
                    value={noteRangeMax}
                    onChange={(e) => setNoteRangeMax(e.target.value)}
                    placeholder="5.00"
                    className="w-full rounded-2xl border border-[#ece8f6] bg-white px-3 py-3 text-sm outline-none"
                  />
                </label>
              </div>
            </div>
          </PanelCard>

          <PanelCard title="Periodos">
            <div className="space-y-2">
              {PERIOD_DEFINITIONS.map((period) => {
                const checked = selectedPeriodKeys.includes(period.key)
                return (
                  <label
                    key={period.key}
                    className={`flex cursor-pointer items-center justify-between gap-3 rounded-2xl border px-3 py-3 text-sm transition ${
                      checked ? 'border-[#9d31ff]/25 bg-[#f8faff]' : 'border-[#ece8f6] bg-white hover:bg-[#f8faff]'
                    }`}
                  >
                    <span>{period.label}</span>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() =>
                        setSelectedPeriodKeys((current) =>
                          current.includes(period.key) ? current.filter((key) => key !== period.key) : [...current, period.key]
                        )
                      }
                    />
                  </label>
                )
              })}
            </div>
          </PanelCard>
        </div>
      </aside>

      <div className="min-h-0 overflow-y-auto p-4 sm:p-6">
        <div className="grid gap-4 md:grid-cols-4">
          <SummaryCard label="Promedio" value={formatScore(filteredMetricStats.average)} helper={`Mediana: ${formatScore(filteredMetricStats.median)}`} />
          <SummaryCard label="Evaluación" value={selectedMetricLabel} helper={`Desv. est.: ${formatScore(filteredMetricStats.stdDev)}`} />
          <SummaryCard
            label="Seleccionados"
            value={selectedStudents.length}
            helper={selectedStudents.length === 0 ? 'Elige hasta 4 alumnos' : selectedStudents.map((s) => s.student_name).join(' vs ')}
          />
          <SummaryCard label="Listado" value={filteredCards.length} helper="Alumnos disponibles" />
        </div>

        <PerformanceMatrixWidget records={filteredCards} />

        {selectedStudents.length >= 2 && (
          <StudentComparisonTable students={selectedStudents} periodKeys={selectedPeriodKeys} />
        )}

        <div className="mt-4 rounded-[2rem] border border-[#ece8f6] bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-3 border-b border-[#ece8f6] pb-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h4 className="text-base font-semibold text-slate-900">
                {selectedStudents.length === 0
                  ? 'Selecciona alumnos para comparar'
                  : selectedStudents.length === 1
                    ? `Rendimiento de ${selectedStudents[0].student_name}`
                    : `Comparación: ${selectedStudents.map((s) => s.student_name).join(' vs ')}`}
              </h4>
              <p className="text-sm text-slate-500">
                {selectedStudents.length === 0
                  ? 'Usa los checkboxes en el lado izquierdo'
                  : chartType === 'bar'
                    ? 'Visualización por periodos'
                    : chartType === 'scatter'
                      ? 'Análisis de relaciones'
                      : 'Tabla de datos'}
              </p>
            </div>
            <div className="inline-flex items-center gap-2 rounded-2xl bg-[#f8faff] px-3 py-2 text-xs font-semibold text-slate-500">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              {selectedStudents.length === 0 ? 'Sin selección' : selectedStudents.length === 1 ? '1 alumno' : `${selectedStudents.length} alumnos comparados`}
            </div>
          </div>

          <div className="mt-4">
            {selectedStudents.length === 0 ? (
              <EmptyChartState />
            ) : chartType === 'table' ? (
              <DataTableView records={selectedStudents} />
            ) : chartType === 'bar' ? (
              <SimpleBarChart series={comparisonChartData.series} categories={comparisonChartData.categories} height={360} />
            ) : (
              <ApexChartPanel type={chartType} options={comparisonChartOptions} series={comparisonChartData.series} height={440} />
            )}
          </div>
        </div>

        {selectedStudents.length > 0 && (
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            {selectedStudents.map((student) => (
              <div key={student.student_id}>
                <StudentDetailCard record={student} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function StudentComparisonTable({ students, periodKeys }) {
  const periods = PERIOD_DEFINITIONS.filter((p) => periodKeys.includes(p.key))
  const rows = [
    ...periods.map((p) => ({ key: p.key, label: p.label })),
    { key: 'final_grade', label: 'PF' },
    { key: 'attendance', label: 'Asistencia' },
  ]

  return (
    <div className="mt-4 overflow-hidden rounded-[2rem] border border-[#ece8f6] bg-white shadow-sm">
      <div className="border-b border-[#ece8f6] bg-[#f8faff] px-5 py-3">
        <h4 className="text-sm font-semibold text-slate-900">Comparación lado a lado</h4>
        <p className="text-xs text-slate-500">Notas de los alumnos seleccionados en columnas paralelas</p>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-[#fafafa]">
            <tr className="text-xs uppercase tracking-[0.16em] text-slate-400">
              <th className="px-5 py-3 font-semibold">Periodo</th>
              {students.map((student) => (
                <th key={student.student_id} className="px-5 py-3 font-semibold text-center">
                  <div className="font-medium text-slate-900">{student.student_name}</div>
                  <div className="text-[10px] text-slate-400 font-normal">{student.student_email}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#ece8f6]">
            {rows.map((row) => (
              <tr key={row.key} className="hover:bg-[#f8faff]">
                <td className="px-5 py-3 font-medium text-slate-700">{row.label}</td>
                {students.map((student) => {
                  const value = row.key === 'attendance' ? getAttendanceValue(student) : student[row.key]
                  const isPassing = row.key === 'final_grade' && Number(value || 0) >= PASSING_GRADE
                  return (
                    <td
                      key={student.student_id}
                      className={`px-5 py-3 text-center font-semibold ${
                        isPassing ? 'text-emerald-600' : 'text-slate-900'
                      }`}
                    >
                      {value !== null && value !== undefined ? formatScore(value) : '-'}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function SimpleBarChart({ series, categories, height = 360 }) {
  if (!series || series.length === 0 || !categories || categories.length === 0) {
    return <EmptyChartState />
  }

  const MAX_VALUE = 5
  const MARGIN = { top: 16, right: 16, bottom: 32, left: 36 }
  const innerW = 800 - MARGIN.left - MARGIN.right
  const innerH = height - MARGIN.top - MARGIN.bottom
  const numCats = categories.length
  const numSers = series.length
  const groupW = innerW / numCats
  const barW = Math.min((groupW * 0.8) / numSers, 60)

  const yScale = (value) => {
    const ratio = Math.min(Math.max(Number(value) || 0, 0), MAX_VALUE) / MAX_VALUE
    return MARGIN.top + innerH - ratio * innerH
  }

  const barHeight = (value) => {
    const ratio = Math.min(Math.max(Number(value) || 0, 0), MAX_VALUE) / MAX_VALUE
    return Math.max(ratio * innerH, 2)
  }

  return (
    <div className="w-full">
      <div className="flex flex-wrap gap-4 justify-center mb-4">
        {series.map((s, i) => (
          <div key={s.name} className="flex items-center gap-1.5 text-xs font-medium text-slate-700">
            <span
              className="inline-block h-3 w-3 rounded-sm"
              style={{ backgroundColor: s.color || CHART_COLORS[i % CHART_COLORS.length] }}
            />
            {s.name}
          </div>
        ))}
      </div>

      <div className="relative w-full overflow-x-auto" style={{ height: `${height}px` }}>
        <svg width="100%" height={height} viewBox={`0 0 800 ${height}`} preserveAspectRatio="xMidYMid meet" className="overflow-visible">
          <defs>
            {series.map((s, i) => (
              <linearGradient key={s.name} id={`barGrad-${i}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={s.color || CHART_COLORS[i % CHART_COLORS.length]} stopOpacity="0.85" />
                <stop offset="100%" stopColor={s.color || CHART_COLORS[i % CHART_COLORS.length]} stopOpacity="0.55" />
              </linearGradient>
            ))}
          </defs>

          {[0, 1, 2, 3, 4, 5].map((value) => {
            const y = yScale(value)
            return (
              <g key={value}>
                <text
                  x={MARGIN.left - 8}
                  y={y + 4}
                  textAnchor="end"
                  fill="#94a3b8"
                  fontSize="11"
                  fontWeight="600"
                >
                  {value}
                </text>
                <line
                  x1={MARGIN.left}
                  x2={800 - MARGIN.right}
                  y1={y}
                  y2={y}
                  stroke={value === PASSING_GRADE ? "#10b981" : "#ece8f6"}
                  strokeWidth={value === PASSING_GRADE ? 2 : 1}
                  strokeDasharray={value === PASSING_GRADE ? "6,3" : "none"}
                />
                {value === PASSING_GRADE && (
                  <text
                    x={800 - MARGIN.right + 4}
                    y={y - 4}
                    fill="#10b981"
                    fontSize="10"
                    fontWeight="600"
                  >
                    Aprobación {PASSING_GRADE}
                  </text>
                )}
              </g>
            )
          })}

          {categories.map((category, catIndex) => {
            const groupStart = MARGIN.left + catIndex * groupW
            const totalBarW = barW * numSers
            const offsetX = groupStart + (groupW - totalBarW) / 2

            return (
              <g key={category}>
                {series.map((s, serIndex) => {
                  const raw = Number(s.data[catIndex]) || 0
                  const bh = barHeight(raw)
                  const bx = offsetX + serIndex * barW
                  const by = yScale(raw)
                  const color = s.color || CHART_COLORS[serIndex % CHART_COLORS.length]

                  return (
                    <g key={`${category}-${s.name}`}>
                      <rect
                        x={bx}
                        y={by}
                        width={barW}
                        height={bh}
                        rx="4"
                        fill={`url(#barGrad-${serIndex})`}
                        stroke={color}
                        strokeWidth="1"
                        className="transition-opacity hover:opacity-80"
                      >
                        <title>{`${s.name}: ${formatScore(raw)}`}</title>
                      </rect>
                      {raw > 0 && (
                        <text
                          x={bx + barW / 2}
                          y={by - 6}
                          textAnchor="middle"
                          fill="#1e293b"
                          fontSize="11"
                          fontWeight="700"
                        >
                          {formatScore(raw)}
                        </text>
                      )}
                    </g>
                  )
                })}
                <text
                  x={groupStart + groupW / 2}
                  y={height - MARGIN.bottom / 2 + 5}
                  textAnchor="middle"
                  fill="#64748b"
                  fontSize="12"
                  fontWeight="600"
                >
                  {category}
                </text>
              </g>
            )
          })}
        </svg>
      </div>
    </div>
  )
}

function ApexChartPanel({ type, options, series, height = 420 }) {
  const containerRef = useRef(null)
  const chartRef = useRef(null)
  const [chartError, setChartError] = useState(null)
  const hasRenderableData =
    Array.isArray(series) &&
    series.length > 0 &&
    series.some((item) => (Array.isArray(item?.data) ? item.data.length > 0 : item?.data !== undefined && item?.data !== null))

  useEffect(() => {
    if (!containerRef.current || !hasRenderableData) return undefined

    let active = true
    setChartError(null)

    const renderChart = async () => {
      const chartOptions = {
        ...options,
        chart: {
          ...(options?.chart || {}),
          zoom: {
            enabled: true,
            type: options?.chart?.zoom?.type || 'x',
            autoScaleYaxis: true,
          },
          toolbar: {
            show: true,
            autoSelected: 'zoom',
            tools: {
              download: true,
              selection: true,
              zoom: true,
              zoomin: true,
              zoomout: true,
              pan: true,
              reset: true,
            },
          },
          animations: {
            enabled: true,
            easing: 'easeinout',
            speed: 700,
          },
          fontFamily: 'Inter, ui-sans-serif, system-ui',
        },
        series,
      }

      if (chartRef.current) {
        chartRef.current.destroy()
        chartRef.current = null
      }

      if (!active || !containerRef.current) return

      try {
        chartRef.current = new ApexCharts(containerRef.current, chartOptions)
        await chartRef.current.render()
      } catch (error) {
        console.error('Failed to render ApexCharts', error)
        setChartError(error instanceof Error ? error.message : 'No se pudo renderizar el gráfico')
      }
    }

    void renderChart()

    return () => {
      active = false
      if (chartRef.current) {
        chartRef.current.destroy()
        chartRef.current = null
      }
    }
  }, [type, options, series, height, hasRenderableData])

  if (!hasRenderableData) {
    return <EmptyChartState />
  }

  if (chartError) {
    return (
      <div className="grid min-h-[18rem] place-items-center rounded-3xl border border-dashed border-[#ece8f6] bg-[#fafafa] px-6 py-10 text-center text-sm text-slate-500">
        <div>
          <div className="font-semibold text-slate-700">El gráfico no pudo cargarse.</div>
          <div className="mt-1 text-xs text-slate-400">{chartError}</div>
        </div>
      </div>
    )
  }

  return <div ref={containerRef} />
}

function buildComparisonChartData({ chartType, selectedCourses, selectedPeriodKeys, filteredCourseRecords }) {
  if (!selectedCourses || selectedCourses.length === 0) {
    return { series: [], categories: [] }
  }

  if (chartType === 'radar') {
    return buildRadarComparisonData(selectedCourses)
  }

  if (chartType === 'scatter') {
    const series = selectedCourses.map((course, index) => ({
      name: course.title,
      data: (course.records || []).map((record) => ({
        x: Number(getAttendanceValue(record) ?? 100),
        y: Number(record.final_grade || 0),
        student_name: record.student_name,
        student_email: record.student_email,
      })),
      color: CHART_COLORS[index % CHART_COLORS.length],
    }))

    return { series }
  }

  const categories = selectedPeriodKeys.map((periodKey) => getAcademicPeriodLabel(periodKey))

  const series = selectedCourses.map((course, index) => ({
    name: course.title,
    data: selectedPeriodKeys.map((periodKey) => computeNumericStats((course.records || []).map((record) => getGradeMetricValue(record, periodKey))).average),
    color: CHART_COLORS[index % CHART_COLORS.length],
  }))

  return {
    categories,
    series,
    filteredCourseRecords,
  }
}

function buildComparisonChartOptions(chartData, chartType, selectedPeriodKeys) {
  if (chartType === 'radar') {
    return {
      chart: {
        type: 'radar',
        height: 440,
      },
      colors: CHART_COLORS,
      xaxis: {
        categories: chartData.categories || ['Promedio', 'Aprobación', 'Asistencia', 'Consistencia', 'Mejora'],
      },
      yaxis: {
        min: 0,
        max: 100,
        tickAmount: 5,
        labels: {
          formatter: (val) => `${Math.round(val)}%`,
        },
      },
      markers: {
        size: 4,
      },
      tooltip: {
        y: {
          formatter: (val) => `${Math.round(val)}%`,
        },
      },
      legend: {
        position: 'top',
      },
      grid: {
        borderColor: '#ece8f6',
      },
    }
  }

  if (chartType === 'scatter') {
    return {
      chart: {
        type: 'scatter',
        height: 440,
        zoom: {
          enabled: true,
          type: 'xy',
        },
        selection: {
          enabled: true,
          type: 'xy',
          fill: {
            color: '#9d31ff',
            opacity: 0.08,
          },
          stroke: {
            width: 1,
            dashArray: 3,
          },
          xaxis: {
            min: 0,
            max: 100,
          },
          yaxis: {
            min: 0,
            max: 5,
          },
        },
      },
      stroke: {
        width: 2,
      },
      markers: {
        size: 7,
        hover: {
          size: 9,
        },
      },
      xaxis: {
        title: {
          text: 'Asistencia (%)',
        },
        min: 0,
        max: 100,
        labels: {
          formatter: (val) => `${val}%`,
        },
      },
      yaxis: {
        title: {
          text: 'Nota final',
        },
        min: 0,
        max: 5,
      },
      tooltip: {
        shared: false,
        intersect: false,
      },
      legend: {
        position: 'top',
      },
      grid: {
        borderColor: '#ece8f6',
      },
      theme: {
        mode: 'light',
      },
      annotations: {
        yaxis: [
          {
            y: PASSING_GRADE,
            borderColor: '#10b981',
            label: {
              text: `Aprobación ${PASSING_GRADE}`,
              style: {
                color: '#fff',
                background: '#10b981',
              },
            },
          },
        ],
      },
    }
  }

  const isBar = chartType === 'bar'

  return {
    chart: {
      type: isBar ? 'bar' : 'area',
      stacked: false,
      height: 440,
      zoom: {
        enabled: true,
        type: 'x',
        autoScaleYaxis: true,
      },
    },
    colors: CHART_COLORS,
    plotOptions: isBar ? {
      bar: {
        borderRadius: 8,
        horizontal: false,
        distributed: false,
        dataLabels: {
          position: 'top',
        },
      },
    } : {},
    stroke: isBar ? {} : {
      curve: 'smooth',
      width: 3,
    },
    dataLabels: {
      enabled: isBar,
      formatter: (value) => formatScore(value),
      offsetY: -5,
    },
    fill: isBar ? {} : {
      type: 'solid',
      opacity: 0.14,
    },
    xaxis: {
      type: 'category',
      categories: chartData.categories || selectedPeriodKeys.map((periodKey) => getAcademicPeriodLabel(periodKey)),
      labels: {
        rotate: -35,
        trim: false,
      },
    },
    yaxis: {
      min: 0,
      max: 5,
      tickAmount: 5,
    },
    tooltip: {
      shared: true,
      intersect: false,
      y: {
        formatter: (value) => formatScore(value),
      },
    },
    legend: {
      position: 'top',
    },
    grid: {
      borderColor: '#ece8f6',
    },
    annotations: {
      yaxis: [
        {
          y: PASSING_GRADE,
          borderColor: '#10b981',
          label: {
            text: `Aprobación ${PASSING_GRADE}`,
            style: {
              color: '#fff',
              background: '#10b981',
            },
          },
        },
      ],
    },
  }
}

function buildStudentChartData(selectedStudent, selectedPeriodKeys, chartType) {
  if (!selectedStudent) {
    return { series: [] }
  }

  const labels = selectedPeriodKeys.map((periodKey) => getAcademicPeriodLabel(periodKey))
  const values = selectedPeriodKeys.map((periodKey) => getGradeMetricValue(selectedStudent, periodKey))

  if (chartType === 'scatter') {
    return {
      series: [
        {
          name: selectedStudent.student_name,
          data: values.map((value, index) => ({
            x: index + 1,
            y: Number(value || 0),
            period: labels[index],
          })),
          color: CHART_COLORS[0],
        },
      ],
      categories: labels,
    }
  }

  return {
    series: [
      {
        name: selectedStudent.student_name,
        data: values,
        color: CHART_COLORS[0],
      },
    ],
    categories: labels,
  }
}

function buildStudentChartOptions(chartData, chartType) {
  if (chartType === 'scatter') {
    return {
      chart: {
        type: 'scatter',
        height: 440,
        zoom: {
          enabled: true,
          type: 'xy',
        },
        selection: {
          enabled: true,
          type: 'xy',
          fill: {
            color: '#9d31ff',
            opacity: 0.08,
          },
          stroke: {
            width: 1,
            dashArray: 3,
          },
          xaxis: {
            min: 0.5,
            max: chartData.categories?.length ? chartData.categories.length + 0.5 : 3.5,
          },
          yaxis: {
            min: 0,
            max: 5,
          },
        },
      },
      markers: {
        size: 8,
        strokeWidth: 2,
        hover: {
          sizeOffset: 3,
        },
      },
      xaxis: {
        title: {
          text: 'Periodo',
        },
        labels: {
          formatter: (value) => `P${value}`,
        },
      },
      yaxis: {
        min: 0,
        max: 5,
        title: {
          text: 'Calificación',
        },
      },
      tooltip: {
        shared: false,
        custom: ({ series, seriesIndex, dataPointIndex, w }) => {
          const point = w.config.series[seriesIndex].data[dataPointIndex]
          return `
            <div class="rounded-2xl border border-[#ece8f6] bg-white px-3 py-2 shadow-xl">
              <div class="text-xs font-semibold text-slate-500">${point?.period || 'Periodo'}</div>
              <div class="mt-1 text-sm font-bold text-slate-900">${formatScore(series[seriesIndex][dataPointIndex])}</div>
            </div>
          `
        },
      },
      legend: {
        position: 'top',
      },
      grid: {
        borderColor: '#ece8f6',
      },
      theme: {
        mode: 'light',
      },
    }
  }

  return {
    chart: {
      type: 'bar',
      stacked: false,
      height: 440,
      zoom: {
        enabled: true,
        type: 'x',
        autoScaleYaxis: true,
      },
    },
    colors: CHART_COLORS,
    plotOptions: {
      bar: {
        borderRadius: 8,
        horizontal: false,
        dataLabels: {
          position: 'top',
        },
      },
    },
    dataLabels: {
      enabled: true,
      formatter: (value) => formatScore(value),
      offsetY: -5,
    },
    xaxis: {
      type: 'category',
      categories: chartData.categories,
      labels: {
        rotate: -15,
        trim: false,
      },
    },
    yaxis: {
      min: 0,
      max: 5,
      tickAmount: 5,
    },
    tooltip: {
      shared: true,
      intersect: false,
      y: {
        formatter: (value) => formatScore(value),
      },
    },
    legend: {
      position: 'top',
    },
    grid: {
      borderColor: '#ece8f6',
    },
    annotations: {
      yaxis: [
        {
          y: PASSING_GRADE,
          borderColor: '#10b981',
          label: {
            text: `Aprobación ${PASSING_GRADE}`,
            style: {
              color: '#fff',
              background: '#10b981',
            },
          },
        },
      ],
    },
  }
}

function PerformanceMatrixWidget({ records = [] }) {
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

function StudentDetailCard({ record }) {
  const navigate = useNavigate()
  if (!record) return null

  const handleOpenTutorPlan = () => {
    const promptText = `Hola Tutor IA. Necesito un plan de tutoría adaptativo y personalizado para ${record.student_name} (${record.student_email}).
Desempeño actual:
- P1: ${formatScore(record.note_1)}
- P2: ${formatScore(record.note_2)}
- P3: ${formatScore(record.note_3)}
- Promedio Final: ${formatScore(record.final_grade)}
- Asistencia: ${getAttendanceValue(record) !== null ? formatScore(getAttendanceValue(record)) + '%' : '100%'}
- Diagnóstico de Riesgo: ${record.risk?.label || 'Bajo Riesgo'} (${record.risk?.reason || 'Sin observaciones'})

Por favor diseña una sesión de aprendizaje adaptativa con 3 ejercicios prácticos de matemáticas enfocado en sus puntos débiles.`

    navigate('/chat', { state: { initialPrompt: promptText } })
  }

  return (
    <div className="rounded-[2rem] border border-[#ece8f6] bg-[#fafafa] p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#9d31ff]">Alumno seleccionado</p>
          <h4 className="mt-2 text-xl font-semibold text-slate-900">{record.student_name}</h4>
          <p className="mt-1 text-sm text-slate-500">{record.student_email}</p>
        </div>
        {record.risk && (
          <span
            className={`rounded-full px-2.5 py-1 text-xs font-bold ${
              record.risk.level === 'alto'
                ? 'bg-rose-100 text-rose-700'
                : record.risk.level === 'medio'
                  ? 'bg-amber-100 text-amber-700'
                  : 'bg-emerald-100 text-emerald-700'
            }`}
          >
            {record.risk.label}
          </span>
        )}
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-4">
        <MetricPill label="P1" value={formatScore(record.note_1)} tone="violet" />
        <MetricPill label="P2" value={formatScore(record.note_2)} tone="rose" />
        <MetricPill label="P3" value={formatScore(record.note_3)} tone="emerald" />
        <MetricPill label="PF" value={formatScore(record.final_grade)} tone="slate" />
      </div>

      <button
        type="button"
        onClick={handleOpenTutorPlan}
        className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#9d31ff] to-[#ff318c] px-4 py-2.5 text-xs font-semibold text-white shadow-md transition hover:brightness-110"
      >
        <Bot className="h-4 w-4" />
        Generar Plan con Tutor IA
      </button>
    </div>
  )
}

function StudentNotesCard({ record }) {
  if (!record) return null

  const attendance = getAttendanceValue(record)

  return (
    <div className="rounded-[2rem] border border-[#ece8f6] bg-white p-5 shadow-sm">
      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#9d31ff]">Detalle académico</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <MetricPill label="Asistencia" value={formatScore(attendance)} tone="emerald" />
        <MetricPill label="Curso" value={record.course_title} tone="slate" />
      </div>
      <div className="mt-4 text-sm text-slate-500">
        <div className="flex items-center justify-between rounded-2xl bg-[#f8faff] px-3 py-2">
          <span>Nota histórica</span>
          <span className="font-semibold text-slate-900">{formatScore(record.final_grade)}</span>
        </div>
      </div>
    </div>
  )
}

function DataTableView({ records }) {
  const sortedRecords = [...records].sort((a, b) => (a.student_name || '').localeCompare(b.student_name || ''))

  return (
    <div className="overflow-hidden rounded-3xl border border-[#ece8f6]">
      <div className="max-h-[28rem] overflow-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="sticky top-0 bg-[#f8faff]">
            <tr className="text-xs uppercase tracking-[0.16em] text-slate-400">
              <th className="px-4 py-3 font-semibold">Alumno</th>
              <th className="px-4 py-3 font-semibold">Curso</th>
              <th className="px-4 py-3 font-semibold">P1</th>
              <th className="px-4 py-3 font-semibold">P2</th>
              <th className="px-4 py-3 font-semibold">P3</th>
              <th className="px-4 py-3 font-semibold">PF</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#ece8f6] bg-white">
            {sortedRecords.map((record) => (
              <tr key={`${record.course_id}-${record.student_id}`}>
                <td className="px-4 py-3">
                  <div className="font-medium text-slate-900">{record.student_name}</div>
                  <div className="text-xs text-slate-500">{record.student_email}</div>
                </td>
                <td className="px-4 py-3">
                  <div className="font-medium text-slate-900">{record.course_title}</div>
                  <div className="text-xs text-slate-500">{record.course_grade_level || 'Sin grado'}</div>
                </td>
                <td className="px-4 py-3 font-semibold text-slate-700">{formatScore(record.note_1)}</td>
                <td className="px-4 py-3 font-semibold text-slate-700">{formatScore(record.note_2)}</td>
                <td className="px-4 py-3 font-semibold text-slate-700">{formatScore(record.note_3)}</td>
                <td className="px-4 py-3 font-semibold text-emerald-600">{formatScore(record.final_grade)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function EmptyChartState() {
  return (
    <div className="grid min-h-[18rem] place-items-center rounded-3xl border border-dashed border-[#ece8f6] bg-[#fafafa] px-6 py-10 text-center text-sm text-slate-500">
      No hay registros con los filtros seleccionados.
    </div>
  )
}

function PanelCard({ title, children }) {
  return (
    <div className="rounded-3xl border border-[#ece8f6] bg-white p-4 shadow-sm">
      <h4 className="text-sm font-semibold text-slate-900">{title}</h4>
      <div className="mt-3">{children}</div>
    </div>
  )
}

function SummaryCard({ label, value, helper }) {
  return (
    <div className="rounded-3xl border border-[#ece8f6] bg-[#fafafa] p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">{label}</p>
      <div className="mt-2 text-2xl font-bold text-slate-900">{value}</div>
      <p className="mt-1 text-xs text-slate-500">{helper}</p>
    </div>
  )
}

function MetricPill({ label, value, tone = 'slate' }) {
  const toneClasses = {
    violet: 'border-[#9d31ff]/15 bg-[#f8faff] text-[#9d31ff]',
    rose: 'border-[#ff318c]/15 bg-[#fff5fb] text-[#ff318c]',
    emerald: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    slate: 'border-slate-200 bg-slate-50 text-slate-700',
  }

  return (
    <div className={`rounded-2xl border px-3 py-3 ${toneClasses[tone] || toneClasses.slate}`}>
      <div className="text-[11px] font-semibold uppercase tracking-[0.15em] opacity-80">{label}</div>
      <div className="mt-2 text-sm font-bold">{value}</div>
    </div>
  )
}
