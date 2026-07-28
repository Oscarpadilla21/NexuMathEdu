import { create, all } from 'mathjs'

const math = create(all, {})

export const PASSING_GRADE = 3
export const PERIOD_DEFINITIONS = [
  { key: 'note_1', label: 'P1' },
  { key: 'note_2', label: 'P2' },
  { key: 'note_3', label: 'P3' },
]

function toFiniteNumber(value, fallback = 0) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function roundScore(value) {
  return math.round(toFiniteNumber(value, 0), 2)
}

export function calculateFinalGrade(note1, note2, note3) {
  const values = [note1, note2, note3].map((value) => toFiniteNumber(value, 0))
  return roundScore(math.mean(values))
}

export function getAcademicPeriodLabel(periodKey) {
  return PERIOD_DEFINITIONS.find((period) => period.key === periodKey)?.label || periodKey
}

export function formatScore(value) {
  return roundScore(value).toFixed(2)
}

export function formatDelta(value) {
  const rounded = roundScore(value)
  if (rounded === 0) return '0.00'

  return `${rounded > 0 ? '+' : ''}${rounded.toFixed(2)}`
}

export function getAttendanceValue(record) {
  const candidates = [
    record?.attendance,
    record?.attendance_rate,
    record?.attendance_pct,
    record?.attendance_percentage,
  ]

  const found = candidates.find((value) => value !== undefined && value !== null && value !== '')
  if (found !== undefined) return toFiniteNumber(found, 0)

  return null
}

export function getGradeMetricValue(record, metric) {
  if (!record) return 0

  if (metric === 'attendance') {
    const att = getAttendanceValue(record)
    return att !== null ? att : 100
  }

  return toFiniteNumber(record[metric], 0)
}

export function computeNumericStats(values) {
  const numericValues = values.map((value) => toFiniteNumber(value, NaN)).filter(Number.isFinite)

  if (numericValues.length === 0) {
    return {
      count: 0,
      average: 0,
      median: 0,
      p75: 0,
      min: 0,
      max: 0,
      stdDev: 0,
    }
  }

  return {
    count: numericValues.length,
    average: roundScore(math.mean(numericValues)),
    median: roundScore(math.median(numericValues)),
    p75: roundScore(math.quantileSeq(numericValues, 0.75)),
    min: roundScore(math.min(numericValues)),
    max: roundScore(math.max(numericValues)),
    stdDev: numericValues.length > 1 ? roundScore(math.std(numericValues)) : 0,
  }
}

function normalizeStudentRecord(course, student, gradeRow, enrollment) {
  const finalGrade = gradeRow?.final_grade ?? enrollment?.final_grade ?? null
  const note1 = gradeRow?.note_1 ?? enrollment?.note_1 ?? null
  const note2 = gradeRow?.note_2 ?? enrollment?.note_2 ?? null
  const note3 = gradeRow?.note_3 ?? enrollment?.note_3 ?? null
  const updatedAt = gradeRow?.updated_at ?? enrollment?.updated_at ?? enrollment?.enrolled_at ?? course?.updated_at ?? course?.created_at ?? null

  return {
    course_id: course?.id || enrollment?.course_id || '',
    course_title: course?.title || enrollment?.course_title || 'Sin curso',
    course_subject: course?.subject || enrollment?.course_subject || '',
    course_grade_level: course?.grade_level || enrollment?.course_grade_level || '',
    course_is_active: course?.is_active ?? true,
    student_id: student?.id || enrollment?.student_id || '',
    student_name: student?.full_name || enrollment?.student_name || student?.email || enrollment?.student_email || 'Sin nombre',
    student_email: student?.email || enrollment?.student_email || '',
    note_1: note1,
    note_2: note2,
    note_3: note3,
    final_grade: finalGrade,
    updated_at: updatedAt,
    attendance: enrollment?.attendance ?? gradeRow?.attendance ?? null,
  }
}

export function getStudentRiskSegment(record) {
  const finalGrade = toFiniteNumber(record?.final_grade ?? record?.note_3 ?? record?.note_2 ?? record?.note_1, 0)
  const attendance = getAttendanceValue(record)
  const p1 = record?.note_1 !== null && record?.note_1 !== undefined ? toFiniteNumber(record.note_1, null) : null
  const p2 = record?.note_2 !== null && record?.note_2 !== undefined ? toFiniteNumber(record.note_2, null) : null
  const p3 = record?.note_3 !== null && record?.note_3 !== undefined ? toFiniteNumber(record.note_3, null) : null

  let drop = 0
  if (p3 !== null && p2 !== null) {
    drop = p2 - p3
  } else if (p2 !== null && p1 !== null) {
    drop = p1 - p2
  }

  const isFailingGrade = finalGrade < 3.0
  const isCriticalAttendance = attendance !== null && attendance >= 0 && attendance < 70
  const isSevereDrop = drop >= 0.8

  if (isFailingGrade || isCriticalAttendance || isSevereDrop) {
    return {
      level: 'alto',
      label: 'Riesgo Alto',
      badgeTone: 'rose',
      reason: isFailingGrade ? 'Nota promedio reprobatoria' : isSevereDrop ? 'Tendencia en descenso severo' : 'Asistencia crítica',
    }
  }

  if (finalGrade >= 3.0 && finalGrade < 3.8) {
    return {
      level: 'medio',
      label: 'Riesgo Medio',
      badgeTone: 'amber',
      reason: 'Rendimiento en zona límite (3.0 - 3.7)',
    }
  }

  return {
    level: 'bajo',
    label: 'Bajo Riesgo',
    badgeTone: 'emerald',
    reason: 'Desempeño académico satisfactorio (>= 3.8)',
  }
}

export function buildCoursePerformanceCatalog({ courses = [], enrollments = [], students = [], courseGrades = [] }) {
  const studentMap = new Map(students.map((student) => [student.id, student]))
  const courseMap = new Map(courses.map((course) => [course.id, course]))
  const gradeMap = new Map()

  courseGrades.forEach((gradeRow) => {
    gradeMap.set(`${gradeRow.course_id}:${gradeRow.student_id}`, gradeRow)
  })

  const recordsByCourseId = new Map()

  enrollments.forEach((enrollment) => {
    const course = courseMap.get(enrollment.course_id) || { id: enrollment.course_id, title: enrollment.course_title }
    const student = studentMap.get(enrollment.student_id)
    const gradeRow = gradeMap.get(`${enrollment.course_id}:${enrollment.student_id}`)
    const normalized = normalizeStudentRecord(course, student, gradeRow, enrollment)

    if (!recordsByCourseId.has(normalized.course_id)) {
      recordsByCourseId.set(normalized.course_id, [])
    }

    recordsByCourseId.get(normalized.course_id).push(normalized)
  })

  courses.forEach((course) => {
    const existingRecords = recordsByCourseId.get(course.id) || []
    if (existingRecords.length > 0) return

    const fallbackStudents = Array.isArray(course.students) ? course.students : []
    if (fallbackStudents.length === 0) return

    const fallbackRecords = fallbackStudents.map((studentEntry) => {
      const normalizedStudent = {
        id: studentEntry.id || studentEntry.student_id || '',
        full_name: studentEntry.full_name || studentEntry.student_name || studentEntry.email || studentEntry.student_email || 'Sin nombre',
        email: studentEntry.email || studentEntry.student_email || '',
      }

      return normalizeStudentRecord(course, normalizedStudent, studentEntry, {
        course_id: course.id,
        student_id: normalizedStudent.id,
        note_1: studentEntry.note_1 ?? null,
        note_2: studentEntry.note_2 ?? null,
        note_3: studentEntry.note_3 ?? null,
        final_grade: studentEntry.final_grade ?? null,
        attendance: studentEntry.attendance ?? null,
        updated_at: studentEntry.updated_at ?? null,
      })
    })

    if (fallbackRecords.length > 0) {
      recordsByCourseId.set(course.id, fallbackRecords)
    }
  })

  let globalHighRiskCount = 0
  let globalMediumRiskCount = 0
  let globalLowRiskCount = 0
  const globalHighRiskStudents = []
  const allRecords = []

  const courseCards = courses.map((course) => {
    const records = (recordsByCourseId.get(course.id) || []).map((rec) => {
      const risk = getStudentRiskSegment(rec)
      allRecords.push({ ...rec, risk })
      return { ...rec, risk }
    })

    const finals = records
      .map((record) => record.final_grade)
      .filter((value) => value !== null && value !== undefined && value !== '')
    const numericFinals = finals.map((value) => toFiniteNumber(value, NaN)).filter(Number.isFinite)
    const approvedCount = numericFinals.filter((value) => value >= PASSING_GRADE).length
    const periodGroups = new Map(
      PERIOD_DEFINITIONS.map((period) => [
        period.key,
        records.map((record) => toFiniteNumber(record[period.key], NaN)).filter(Number.isFinite),
      ])
    )

    const highRiskInCourse = records.filter((r) => r.risk.level === 'alto')
    const mediumRiskInCourse = records.filter((r) => r.risk.level === 'medio')
    const lowRiskInCourse = records.filter((r) => r.risk.level === 'bajo')

    globalHighRiskCount += highRiskInCourse.length
    globalMediumRiskCount += mediumRiskInCourse.length
    globalLowRiskCount += lowRiskInCourse.length
    globalHighRiskStudents.push(...highRiskInCourse)

    const periodKeys = PERIOD_DEFINITIONS.map((period) => period.key)
    const validPeriodKeys = PERIOD_DEFINITIONS.filter((period) => (periodGroups.get(period.key) || []).length > 0).map((period) => period.key)
    const latestPeriodKey = validPeriodKeys.at(-1) || 'note_3'
    const latestIndex = PERIOD_DEFINITIONS.findIndex((period) => period.key === latestPeriodKey)
    const previousPeriodKey = latestIndex > 0 ? PERIOD_DEFINITIONS[latestIndex - 1].key : null
    const latestAverage = computeNumericStats(periodGroups.get(latestPeriodKey) || []).average
    const previousAverage = previousPeriodKey ? computeNumericStats(periodGroups.get(previousPeriodKey) || []).average : null
    const improvement = previousAverage === null ? null : roundScore(latestAverage - previousAverage)

    const courseStats = computeNumericStats(numericFinals)

    const p1Stats = computeNumericStats(periodGroups.get('note_1') || [])
    const p2Stats = computeNumericStats(periodGroups.get('note_2') || [])
    const p3Stats = computeNumericStats(periodGroups.get('note_3') || [])

    return {
      ...course,
      records,
      periodGroups,
      periodKeys,
      average_final: courseStats.average,
      median_final: courseStats.median,
      p75_final: courseStats.p75,
      std_final: courseStats.stdDev,
      approved_count: approvedCount,
      total_students: records.length,
      latest_period_key: latestPeriodKey,
      latest_period_label: getAcademicPeriodLabel(latestPeriodKey),
      improvement_from_previous_period: improvement,
      previous_period_key: previousPeriodKey,
      previous_period_label: previousPeriodKey ? getAcademicPeriodLabel(previousPeriodKey) : null,
      risk_segments: {
        high: highRiskInCourse.length,
        medium: mediumRiskInCourse.length,
        low: lowRiskInCourse.length,
      },
      temporal_trends: {
        p1: p1Stats.average,
        p2: p2Stats.average,
        p3: p3Stats.average,
        overallDelta: p3Stats.average && p1Stats.average ? roundScore(p3Stats.average - p1Stats.average) : 0,
      },
    }
  })

  const periodKeys = PERIOD_DEFINITIONS.map((period) => period.key)
  const groupOptions = [...new Set(courseCards.map((course) => course.grade_level || 'Sin grupo'))].sort((a, b) => a.localeCompare(b))

  const allFinals = allRecords
    .map((r) => toFiniteNumber(r.final_grade, NaN))
    .filter(Number.isFinite)
  const globalStats = computeNumericStats(allFinals)
  const globalPassingRate = allRecords.length > 0 ? roundScore((allRecords.filter((r) => toFiniteNumber(r.final_grade, 0) >= PASSING_GRADE).length / allRecords.length) * 100) : 0

  return {
    courses: courseCards,
    courseMap,
    recordsByCourseId,
    periodKeys,
    periodOptions: periodKeys.map((key) => ({ key, label: getAcademicPeriodLabel(key) })),
    groupOptions,
    macroSummary: {
      totalStudents: allRecords.length,
      averageFinalGrade: globalStats.average,
      medianFinalGrade: globalStats.median,
      passingRate: globalPassingRate,
      riskSegments: {
        high: globalHighRiskCount,
        medium: globalMediumRiskCount,
        low: globalLowRiskCount,
        highRiskStudentsList: globalHighRiskStudents,
      },
    },
  }
}

export function filterCourseRecords(records, {
  selectedPeriodKeys = [],
  selectedGroup = 'all',
  noteRangeMin = '',
  noteRangeMax = '',
  evaluationMetric = 'final_grade',
} = {}) {
  const periodSet = new Set(selectedPeriodKeys)
  const minValue = noteRangeMin === '' ? null : toFiniteNumber(noteRangeMin, null)
  const maxValue = noteRangeMax === '' ? null : toFiniteNumber(noteRangeMax, null)

  return records.filter((record) => {
    const value = getGradeMetricValue(record, evaluationMetric)

    if (periodSet.size > 0 && evaluationMetric.startsWith('note_')) {
      if (!periodSet.has(evaluationMetric)) {
        return false
      }
    }

    if (selectedGroup !== 'all') {
      const groupValue = record.course_grade_level || 'Sin grupo'
      if (groupValue !== selectedGroup) {
        return false
      }
    }

    if (minValue !== null && value < minValue) {
      return false
    }

    if (maxValue !== null && value > maxValue) {
      return false
    }

    return true
  })
}

