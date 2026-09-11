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

  if (!supabaseUrl || !publishableKey) {
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
    .select('id, full_name, email, role, grade_level')
    .eq('id', userData.user.id)
    .maybeSingle()

  // Si no hay perfil, usamos datos del auth como fallback
  const profile = profileData || {
    id: userData.user.id,
    email: userData.user.email || '',
    full_name: userData.user.user_metadata?.full_name || userData.user.email || 'Usuario',
    role: userData.user.user_metadata?.role || userData.user.app_metadata?.role || 'student',
    grade_level: userData.user.user_metadata?.grade_level || null,
  }

  const [enrollmentsResult, coursesResult, gradesResult] = await Promise.all([
    callerClient
      .from('enrollments')
      .select('course_id, student_id, enrolled_at')
      .eq('student_id', userData.user.id)
      .order('enrolled_at', { ascending: false }),
    callerClient
      .from('courses')
      .select('id, title, description, subject, grade_level, teacher_id, is_active, created_at')
      .order('created_at', { ascending: false }),
    callerClient
      .from('course_grades')
      .select('course_id, student_id, note_1, note_2, note_3, final_grade, updated_at')
      .eq('student_id', userData.user.id),
  ])

  if (enrollmentsResult.error) {
    return json({ error: enrollmentsResult.error.message }, 500)
  }

  if (coursesResult.error) {
    return json({ error: coursesResult.error.message }, 500)
  }

  if (gradesResult.error) {
    return json({ error: gradesResult.error.message }, 500)
  }

  const courseMap = new Map((coursesResult.data || []).map((course) => [course.id, course]))
  const gradeMap = new Map((gradesResult.data || []).map((gradeRow) => [gradeRow.course_id, gradeRow]))

  const enrollments = (enrollmentsResult.data || []).map((enrollment) => {
    const course = courseMap.get(enrollment.course_id)
    const gradeRow = gradeMap.get(enrollment.course_id)

    return {
      course_id: enrollment.course_id,
      student_id: enrollment.student_id,
      course_title: course?.title || 'Sin curso',
      course_subject: course?.subject || '',
      course_grade_level: course?.grade_level || '',
      note_1: gradeRow?.note_1 ?? null,
      note_2: gradeRow?.note_2 ?? null,
      note_3: gradeRow?.note_3 ?? null,
      final_grade: gradeRow?.final_grade ?? null,
      updated_at: gradeRow?.updated_at ?? null,
    }
  })

  return json({
    profile,
    courses: (coursesResult.data || []).filter((course) =>
      (enrollmentsResult.data || []).some((enrollment) => enrollment.course_id === course.id)
    ),
    enrollments,
  })

})
