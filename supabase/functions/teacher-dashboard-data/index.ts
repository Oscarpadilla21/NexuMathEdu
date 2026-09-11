import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from 'jsr:@supabase/supabase-js@2/cors'

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405)
  }

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return json({ error: 'Missing Authorization header' }, 401)
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const publishableKey = Deno.env.get('SUPABASE_PUBLISHABLE_KEY') || Deno.env.get('SUPABASE_ANON_KEY')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

  if (!supabaseUrl || !publishableKey || !serviceRoleKey) {
    return json({ error: 'Missing Supabase secrets' }, 500)
  }

  const callerClient = createClient(supabaseUrl, publishableKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      headers: {
        Authorization: authHeader,
      },
    },
  })

  const { data: userData, error: userError } = await callerClient.auth.getUser()
  if (userError || !userData?.user) {
    return json({ error: 'Unauthorized' }, 401)
  }

  const { data: profileData } = await callerClient
    .from('profiles')
    .select('role, full_name, email')
    .eq('id', userData.user.id)
    .maybeSingle()

  const fallbackRole = userData.user.user_metadata?.role || userData.user.app_metadata?.role || 'teacher'
  const effectiveRole = profileData?.role || fallbackRole

  if (effectiveRole !== 'teacher' && effectiveRole !== 'admin') {
    return json({ error: 'Forbidden' }, 403)
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  const coursesQuery = adminClient
    .from('courses')
    .select('id, title, description, subject, grade_level, teacher_id, is_active, created_at')
    .order('created_at', { ascending: false })

  const { data: coursesData, error: coursesError } =
    effectiveRole === 'admin'
      ? await coursesQuery
      : await coursesQuery.eq('teacher_id', userData.user.id)

  if (coursesError) {
    return json({ error: coursesError.message }, 500)
  }

  const courseList = coursesData || []
  const courseIds = courseList.map((course) => course.id)

  // Build students query: get students created by this teacher AND students enrolled in their courses
  let studentsQueryBuilder = adminClient
    .from('profiles')
    .select('id, email, full_name, role, created_at, created_by, grade_level, assigned_grade_levels')
    .eq('role', 'student')

  if (effectiveRole === 'teacher') {
    studentsQueryBuilder = studentsQueryBuilder.eq('created_by', userData.user.id)
  }
  // Admins see all students

  const [studentsResult, enrollmentsResult, gradesResult] = await Promise.all([
    studentsQueryBuilder.order('created_at', { ascending: false }),
    courseIds.length > 0
      ? adminClient
          .from('enrollments')
          .select('course_id, student_id, enrolled_at')
          .in('course_id', courseIds)
          .order('enrolled_at', { ascending: true })
      : Promise.resolve({ data: [], error: null }),
    courseIds.length > 0
      ? adminClient
          .from('course_grades')
          .select('course_id, student_id, note_1, note_2, note_3, final_grade, updated_at')
          .in('course_id', courseIds)
      : Promise.resolve({ data: [], error: null }),
  ])

  if (studentsResult.error) {
    return json({ error: studentsResult.error.message }, 500)
  }

  if (enrollmentsResult.error) {
    return json({ error: enrollmentsResult.error.message }, 500)
  }

  if (gradesResult.error) {
    return json({ error: gradesResult.error.message }, 500)
  }

  const availableStudents = studentsResult.data || []
  const studentMap = new Map(availableStudents.map((student) => [student.id, student]))

  // If teacher: also fetch enrolled students that may have been created by admin
  if (effectiveRole === 'teacher' && courseIds.length > 0) {
    const enrolledStudentIds = new Set((enrollmentsResult.data || []).map(e => e.student_id))
    const missingIds = [...enrolledStudentIds].filter(id => !studentMap.has(id))

    if (missingIds.length > 0) {
      const { data: extraStudents } = await adminClient
        .from('profiles')
        .select('id, email, full_name, role, created_at, created_by, grade_level, assigned_grade_levels')
        .in('id', missingIds)

      if (extraStudents) {
        extraStudents.forEach(s => studentMap.set(s.id, s))
      }
    }
  }

  const missingGradeIds = [...studentMap.values()]
    .filter((student) => !student.grade_level)
    .map((student) => student.id)

  if (missingGradeIds.length > 0) {
    try {
      const authUsersWithMetadata = await Promise.all(
        missingGradeIds.map(async (id) => {
          const { data, error } = await adminClient.auth.admin.getUserById(id)
          if (error || !data?.user) return null
          return {
            id: data.user.id,
            user_metadata: data.user.user_metadata,
          }
        })
      )

      authUsersWithMetadata.forEach((authUser) => {
        if (!authUser) return
        const student = studentMap.get(authUser.id)
        if (student && !student.grade_level) {
          student.grade_level = authUser.user_metadata?.grade_level || student.grade_level
        }
      })
    } catch (err) {
      console.error('Error fetching auth users:', err)
    }
  }

  const visibleStudentIds = new Set<string>()

  const enrollmentsByCourse = new Map<string, string[]>()
  ;(enrollmentsResult.data || []).forEach((enrollment) => {
    if (!enrollmentsByCourse.has(enrollment.course_id)) {
      enrollmentsByCourse.set(enrollment.course_id, [])
    }

    enrollmentsByCourse.get(enrollment.course_id)?.push(enrollment.student_id)
    visibleStudentIds.add(enrollment.student_id)
  })

  const gradeMap = new Map<string, Map<string, any>>()
  ;(gradesResult.data || []).forEach((gradeRow) => {
    if (!gradeMap.has(gradeRow.course_id)) {
      gradeMap.set(gradeRow.course_id, new Map())
    }

    gradeMap.get(gradeRow.course_id)?.set(gradeRow.student_id, gradeRow)
  })

  const courses = courseList.map((course) => {
    const studentIdsForCourse = enrollmentsByCourse.get(course.id) || []
    const courseGrades = gradeMap.get(course.id) || new Map()

    const students = studentIdsForCourse.map((studentId) => {
      visibleStudentIds.add(studentId)
      const student = studentMap.get(studentId)
      const gradeRow = courseGrades.get(studentId)

      return {
        id: studentId,
        email: student?.email || '',
        full_name: student?.full_name || student?.email || 'Sin nombre',
        role: student?.role || 'student',
        grade_level: student?.grade_level || null,
        assigned_grade_levels: student?.assigned_grade_levels || [],
        note_1: gradeRow?.note_1 ?? null,
        note_2: gradeRow?.note_2 ?? null,
        note_3: gradeRow?.note_3 ?? null,
        final_grade: gradeRow?.final_grade ?? null,
      }
    })

    return {
      ...course,
      student_count: students.length,
      students,
    }
  })

  const enrollments = courseList.flatMap((course) => {
    const studentIdsForCourse = enrollmentsByCourse.get(course.id) || []
    const courseGrades = gradeMap.get(course.id) || new Map()

    return studentIdsForCourse.map((studentId) => {
      const student = studentMap.get(studentId)
      const gradeRow = courseGrades.get(studentId)

      return {
        course_id: course.id,
        course_title: course.title,
        course_subject: course.subject,
        course_grade_level: course.grade_level,
        student_id: studentId,
        student_name: student?.full_name || student?.email || 'Sin nombre',
        student_email: student?.email || '',
        note_1: gradeRow?.note_1 ?? null,
        note_2: gradeRow?.note_2 ?? null,
        note_3: gradeRow?.note_3 ?? null,
        final_grade: gradeRow?.final_grade ?? null,
        updated_at: gradeRow?.updated_at ?? null,
      }
    })
  })

  const visibleStudents = effectiveRole === 'teacher' ? Array.from(studentMap.values()) : availableStudents

  return json({
    courses,
    students: visibleStudents,
    enrollments,
    total_courses: courses.length,
    total_students: visibleStudents.length,
  })
})
