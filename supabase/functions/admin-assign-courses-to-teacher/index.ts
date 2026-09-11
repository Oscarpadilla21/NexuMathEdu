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

  let body: {
    teacher_id?: string
    course_ids?: string[]
  }

  try {
    body = await req.json()
  } catch {
    return json({ error: 'Invalid JSON body' }, 400)
  }

  const teacherId = String(body?.teacher_id || '').trim()
  const courseIds = Array.isArray(body?.course_ids) ? body.course_ids.filter((id) => typeof id === 'string' && id.trim()) : []

  if (!teacherId || courseIds.length === 0) {
    return json({ error: 'teacher_id and course_ids array are required' }, 400)
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

  // Verify caller is admin
  const { data: userData, error: userError } = await callerClient.auth.getUser()
  if (userError || !userData?.user) {
    return json({ error: 'Unauthorized' }, 401)
  }

  const { data: profileData } = await callerClient
    .from('profiles')
    .select('role')
    .eq('id', userData.user.id)
    .maybeSingle()

  const fallbackRole = userData.user.user_metadata?.role || userData.user.app_metadata?.role || null
  const effectiveRole = profileData?.role || fallbackRole

  if (effectiveRole !== 'admin') {
    return json({ error: 'Only admins can assign courses to teachers' }, 403)
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  // Verify teacher exists and is actually a teacher
  const { data: teacherProfile, error: teacherError } = await adminClient
    .from('profiles')
    .select('id, role')
    .eq('id', teacherId)
    .maybeSingle()

  if (teacherError || !teacherProfile) {
    return json({ error: 'Teacher not found' }, 404)
  }

  if (teacherProfile.role !== 'teacher') {
    return json({ error: 'Target user is not a teacher' }, 400)
  }

  // Update teacher_id for each course
  const updatePromises = courseIds.map((courseId) =>
    adminClient
      .from('courses')
      .update({ teacher_id: teacherId })
      .eq('id', courseId)
  )

  const results = await Promise.all(updatePromises)

  let successCount = 0
  let failureCount = 0
  const errors: string[] = []

  results.forEach((result, index) => {
    if (result.error) {
      failureCount++
      errors.push(`Curso ${courseIds[index]}: ${result.error.message}`)
    } else {
      successCount++
    }
  })

  if (failureCount > 0 && successCount === 0) {
    return json({
      error: `Failed to assign all courses. Details: ${errors.slice(0, 3).join('; ')}`,
      details: {
        courseIds,
        teacherId,
        errors,
      },
    }, 500)
  }

  return json({
    success: true,
    assigned: successCount,
    failed: failureCount,
    total: courseIds.length,
    message: `${successCount} cursos asignados a profesor. ${failureCount} fallos.`,
    errors: failureCount > 0 ? errors : [],
  })
})
