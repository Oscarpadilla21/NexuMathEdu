import { useEffect, useMemo, useRef, useState } from 'react'
import ApexCharts from 'apexcharts'
import {
  BarChart3,
  CheckCircle2,
  Filter,
  LineChart,
  ScatterChart,
  Table2,
  TrendingUp,
  X,
} from 'lucide-react'
import {
  PASSING_GRADE,
  PERIOD_DEFINITIONS,
  buildCoursePerformanceCatalog,
  computeNumericStats,
  formatDelta,
  formatScore,
  getAcademicPeriodLabel,
  getAttendanceValue,
  getGradeMetricValue,
} from '../../utils/courseAnalytics'

const CHART_OPTIONS = [
  { value: 'bar', label: 'Barras', icon: BarChart3 },
  { value: 'area', label: 'Lineas', icon: LineChart },
  { value: 'scatter', label: 'Disersion', icon: ScatterChart },
  { value: 'table', label: 'Tabla', icon: Table2 },
]

const STUDENT_CHART_OPTIONS = [
  { value: 'bar', label: 'Barras', icon: BarChart3 },
  { value: 'scatter', label: 'Disersion', icon: ScatterChart },
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
  description = 'Explora promedio general, aprobados y variacion frente al periodo anterior.',
  courses = [],
  enrollments = [],
  students = [],
  courseGrades = [],
  emptyMessage = 'Todavia no hay cursos con datos suficientes para analizar.',
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
          </div>
          <p className="text-sm text-slate-500">{description}</p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-2xl border border-[#ece8f6] bg-[#fafafa] px-3 py-2 text-xs font-semibold text-slate-600">
          <Filter className="h-4 w-4" />
          {catalog.periodOptions.length > 0 ? `${catalog.periodOptions.length} periodos detectados` : 'Sin periodos detectados'}
        </div>
      </div>

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

                <p className="mt-3 text-sm leading-6 text-slate-600">{course.description || 'Sin descripcion.'}</p>

                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <MetricPill label="Promedio" value={formatScore(course.average_final)} tone="violet" />
                  <MetricPill label="Aprobados" value={`${course.approved_count}/${course.total_students || 0}`} tone="rose" />
                  <MetricPill
                    label="Mejora"
                    value={course.improvement_from_previous_period === null ? 'Sin historico' : formatDelta(course.improvement_from_previous_period)}
                    tone={course.improvement_from_previous_period === null ? 'slate' : course.improvement_from_previous_period >= 0 ? 'emerald' : 'slate'}
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={() => openCourseAnalysis(course.id)}
                className="mt-5 inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#9d31ff] to-[#ff318c] px-4 py-3 text-sm font-semibold text-white shadow-lg transition hover:brightness-110"
              >
                <TrendingUp className="h-4 w-4" />
                Ver rendimiento del curso
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
            <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-[#9d31ff]">Analisis detallado</p>
            <h3 className="mt-2 text-2xl font-semibold text-slate-900">{course.title}</h3>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
              {activeView === 'students'
                ? 'Vista individual por alumno dentro del curso.'
                : 'Vista de comparacion entre cursos.'}
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
              Ver alumnos del curso
            </button>
          </div>
        </div>

        {activeView === 'courses' ? (
          <CourseComparisonView
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
      setSelectedCourseIds([catalog.courses[0].id])
    }
  }, [catalog.courses, selectedCourseIds, setSelectedCourseIds])

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

  return (
    <div className="grid min-h-0 flex-1 gap-0 lg:grid-cols-[340px_1fr]">
      <aside className="min-h-0 overflow-y-auto border-b border-[#ece8f6] bg-[#fafafa] p-4 lg:border-b-0 lg:border-r">
        <div className="space-y-4">
          <PanelCard title="Vista">
            <div className="flex flex-wrap gap-2">
              <span className="rounded-2xl border border-[#ece8f6] bg-white px-3 py-2 text-sm font-semibold text-slate-500">
                Comparacion de cursos
              </span>
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

          <PanelCard title="Tipo de grafico">
            <div className="grid grid-cols-2 gap-2">
              {STUDENT_CHART_OPTIONS.map((option) => {
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
                <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">Tipo de evaluacion</span>
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
            label="Evaluacion"
            value={METRIC_OPTIONS.find((item) => item.value === evaluationMetric)?.label || 'Nota final'}
            helper={`Desv. est.: ${formatScore(courseMetricStats.stdDev)}`}
          />
          <SummaryCard
            label="Periodos activos"
            value={selectedPeriodKeys.length || 0}
            helper={selectedPeriodKeys.map((period) => getAcademicPeriodLabel(period)).join(', ') || 'Todos desactivados'}
          />
        </div>

        <div className="mt-4 rounded-[2rem] border border-[#ece8f6] bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-3 border-b border-[#ece8f6] pb-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h4 className="text-base font-semibold text-slate-900">
                {chartType === 'bar'
                  ? 'Comparacion por periodos'
                  : chartType === 'area'
                    ? 'Evolucion temporal'
                    : chartType === 'scatter'
                      ? 'Relacion entre variables'
                      : 'Datos detallados'}
              </h4>
              <p className="text-sm text-slate-500">Zoom, toolbar y estados interactivos activados con ApexCharts.</p>
            </div>
            <div className="inline-flex items-center gap-2 rounded-2xl bg-[#f8faff] px-3 py-2 text-xs font-semibold text-slate-500">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              {filteredCourseRecords.length} registro(s) filtrado(s)
            </div>
          </div>

          <div className="mt-4">
            {chartType === 'table' ? (
              <DataTableView records={filteredCourseRecords} />
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
    // Filtro por grupo
    if (selectedGroup !== 'all' && (record.course_grade_level || 'Sin grupo') !== selectedGroup) {
      return false
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
  
  // Función para toggle selección
  const toggleStudentSelection = (studentId) => {
    setSelectedStudentIds((current) => {
      if (current.includes(studentId)) {
        return current.filter((id) => id !== studentId)
      } else {
        // Máximo 2 alumnos
        if (current.length >= 2) {
          return [current[1], studentId]
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

  return (
    <div className="grid min-h-0 flex-1 gap-0 lg:grid-cols-[380px_1fr]">
      <aside className="min-h-0 overflow-y-auto border-b border-[#ece8f6] bg-[#fafafa] p-4 lg:border-b-0 lg:border-r">
        <div className="space-y-4">
          <PanelCard title="Vista">
            <div className="flex flex-wrap gap-2">
              <span className="rounded-2xl border border-[#ece8f6] bg-white px-3 py-2 text-sm font-semibold text-slate-500">
                {selectedStudents.length === 0
                  ? 'Sin selección'
                  : selectedStudents.length === 1
                    ? 'Rendimiento individual'
                    : 'Comparación de 2 alumnos'}
              </span>
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
                        disabled={!isSelected && selectedStudentIds.length >= 2}
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
                  {studentSearchQuery ? 'Sin resultados en la búsqueda.' : 'Este curso no tiene estudiantes visibles.'}
                </div>
              )}
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
                  {[...new Set(studentRecords.map((record) => record.course_grade_level || 'Sin grupo'))].map((group) => (
                    <option key={group} value={group}>
                      {group}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">Tipo de evaluacion</span>
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
          <SummaryCard label="Evaluacion" value={selectedMetricLabel} helper={`Desv. est.: ${formatScore(filteredMetricStats.stdDev)}`} />
          <SummaryCard
            label="Seleccionados"
            value={selectedStudents.length}
            helper={selectedStudents.length === 0 ? 'Elige 1 o 2 alumnos' : selectedStudents.map((s) => s.student_name).join(' vs ')}
          />
          <SummaryCard label="Listado" value={filteredCards.length} helper="Alumnos disponibles" />
        </div>

        <div className="mt-4 rounded-[2rem] border border-[#ece8f6] bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-3 border-b border-[#ece8f6] pb-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h4 className="text-base font-semibold text-slate-900">
                {selectedStudents.length === 0
                  ? 'Selecciona alumnos para comparar'
                  : selectedStudents.length === 1
                    ? `Rendimiento de ${selectedStudents[0].student_name}`
                    : `Comparación: ${selectedStudents[0].student_name} vs ${selectedStudents[1].student_name}`}
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
              {selectedStudents.length === 0 ? 'Sin selección' : selectedStudents.length === 1 ? '1 alumno' : '2 alumnos comparados'}
            </div>
          </div>

          <div className="mt-4">
            {selectedStudents.length === 0 ? (
              <EmptyChartState />
            ) : chartType === 'table' ? (
              <DataTableView records={selectedStudents} />
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
      const baseChartOptions = {
        chart: {
          type: options?.chart?.type || type,
          height: options?.chart?.height || height,
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
      }

      const chartOptions = {
        ...options,
        ...baseChartOptions,
        chart: {
          ...baseChartOptions.chart,
          ...(options?.chart || {}),
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
        setChartError(error instanceof Error ? error.message : 'No se pudo renderizar la grafica')
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
          <div className="font-semibold text-slate-700">La grafica no pudo cargarse.</div>
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

  if (chartType === 'scatter') {
    const series = selectedCourses.map((course, index) => ({
      name: course.title,
      data: (course.records || []).map((record) => ({
        x: Number(getAttendanceValue(record) || 0),
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
            max: 5,
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
          text: 'Asistencia',
        },
        min: 0,
        max: 5,
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
      states: {
        hover: {
          filter: {
            type: 'lighten',
            value: 0.08,
          },
        },
        active: {
          filter: {
            type: 'darken',
            value: 0.15,
          },
        },
      },
      annotations: {
        yaxis: [
          {
            y: PASSING_GRADE,
            borderColor: '#10b981',
            label: {
              text: `Aprobacion ${PASSING_GRADE}`,
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

  return {
    chart: {
      type: chartType === 'area' ? 'area' : 'bar',
      height: 440,
      zoom: {
        enabled: true,
        type: 'x',
        autoScaleYaxis: true,
      },
    },
    colors: CHART_COLORS,
    plotOptions: chartType === 'bar' ? {
      bar: {
        borderRadius: 8,
        columnWidth: '38%',
        distributed: false,
      },
    } : {},
    stroke: {
      curve: 'smooth',
      width: chartType === 'area' ? 3 : 2,
    },
    dataLabels: {
      enabled: chartType === 'bar',
      formatter: (value) => formatScore(value),
    },
    fill: chartType === 'area' ? {
      type: 'solid',
      opacity: 0.14,
    } : {},
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
            text: `Aprobacion ${PASSING_GRADE}`,
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
          text: 'Calificacion',
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
      states: {
        hover: {
          filter: {
            type: 'lighten',
            value: 0.1,
          },
        },
        active: {
          filter: {
            type: 'darken',
            value: 0.15,
          },
        },
      },
    }
  }

  return {
    chart: {
      type: 'bar',
      height: 440,
      zoom: {
        enabled: true,
        type: 'x',
        autoScaleYaxis: true,
      },
    },
    colors: CHART_COLORS,
    plotOptions: chartType === 'bar' ? {
      bar: {
        borderRadius: 8,
        columnWidth: '36%',
      },
    } : {},
    stroke: {
      curve: 'smooth',
      width: 2,
    },
    dataLabels: {
      enabled: chartType === 'bar',
      formatter: (value) => formatScore(value),
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
            text: `Aprobacion ${PASSING_GRADE}`,
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

function StudentDetailCard({ record }) {
  if (!record) return null

  return (
    <div className="rounded-[2rem] border border-[#ece8f6] bg-[#fafafa] p-5 shadow-sm">
      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#9d31ff]">Alumno seleccionado</p>
      <h4 className="mt-2 text-xl font-semibold text-slate-900">{record.student_name}</h4>
      <p className="mt-1 text-sm text-slate-500">{record.student_email}</p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <MetricPill label="P1" value={formatScore(record.note_1)} tone="violet" />
        <MetricPill label="P2" value={formatScore(record.note_2)} tone="rose" />
        <MetricPill label="P3" value={formatScore(record.note_3)} tone="emerald" />
        <MetricPill label="PF" value={formatScore(record.final_grade)} tone="slate" />
      </div>
    </div>
  )
}

function StudentNotesCard({ record }) {
  if (!record) return null

  const attendance = getAttendanceValue(record)

  return (
    <div className="rounded-[2rem] border border-[#ece8f6] bg-white p-5 shadow-sm">
      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#9d31ff]">Detalle academico</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <MetricPill label="Asistencia" value={formatScore(attendance)} tone="emerald" />
        <MetricPill label="Curso" value={record.course_title} tone="slate" />
      </div>
      <div className="mt-4 text-sm text-slate-500">
        <div className="flex items-center justify-between rounded-2xl bg-[#f8faff] px-3 py-2">
          <span>Nota historica</span>
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
