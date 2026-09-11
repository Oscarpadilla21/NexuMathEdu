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
    course_id?: string
  }

  try {
    body = await req.json()
  } catch {
    return json({ error: 'Invalid JSON body' }, 400)
  }

  const courseId = String(body?.course_id || '').trim()
  if (!courseId) {
    return json({ error: 'course_id is required' }, 400)
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
    .select('role')
    .eq('id', userData.user.id)
    .maybeSingle()

  const fallbackRole = userData.user.user_metadata?.role || userData.user.app_metadata?.role || null
  const effectiveRole = profileData?.role || fallbackRole

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  // Get course details
  const { data: course } = await adminClient
    .from('courses')
    .select('id, title, teacher_id')
    .eq('id', courseId)
    .maybeSingle()

  if (!course) {
    return json({ error: 'Course not found' }, 404)
  }

  // Permission check: only admins or the course's teacher can delete
  if (effectiveRole !== 'admin' && course.teacher_id !== userData.user.id) {
    return json({ error: 'You do not have permission to delete this course' }, 403)
  }

  // Delete course (cascade will delete enrollments and grades)
  const { error: deleteError } = await adminClient.from('courses').delete().eq('id', courseId)

  if (deleteError) {
    return json({ error: deleteError.message }, 400)
  }

  return json({
    success: true,
    message: `Curso "${course.title}" eliminado correctamente.`,
    deleted_course: course,
  })
})
