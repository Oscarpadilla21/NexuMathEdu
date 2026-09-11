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
    id?: string
    email?: string
    full_name?: string
    role?: string
    grade_level?: string
    assigned_grade_levels?: string[] | string
  }

  try {
    body = await req.json()
  } catch {
    return json({ error: 'Invalid JSON body' }, 400)
  }

  const id = String(body?.id || '').trim()
  const email = String(body?.email || '').trim().toLowerCase()
  const fullName = String(body?.full_name || '').trim()
  const requestedRole = String(body?.role || 'student')
  const gradeLevel = String(body?.grade_level || '').trim()
  const rawAssignedGradeLevels = body?.assigned_grade_levels
  const normalizeGradeLevels = (value: unknown) => {
    if (Array.isArray(value)) {
      return value.map((grade: unknown) => String(grade || '').trim()).filter(Boolean)
    }

    if (typeof value === 'string') {
      return value
        .split(',')
        .map((grade) => grade.trim())
        .filter(Boolean)
    }

    return []
  }

  const assignedGradeLevels = Array.from(
    new Set([
      ...normalizeGradeLevels(rawAssignedGradeLevels),
    ])
  )

  const VALID_GRADE_LEVELS = [
    'Sexto de bachillerato',
    'Septimo de bachillerato',
    'Octavo de bachillerato',
    'Noveno de bachillerato',
    'Decimo de bachillerato',
    'Undecimo de bachillerato',
  ]

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const publishableKey = Deno.env.get('SUPABASE_PUBLISHABLE_KEY') || Deno.env.get('SUPABASE_ANON_KEY')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

  if (!supabaseUrl || !publishableKey || !serviceRoleKey) {
    return json(
      {
        error:
          'Missing Supabase secrets. Set SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY (or SUPABASE_ANON_KEY) and SUPABASE_SERVICE_ROLE_KEY.',
      },
      500
    )
  }

  if (!id || !email || !fullName) {
    return json({ error: 'id, email y full_name son requeridos' }, 400)
  }

  let role: string
  if (requestedRole === 'teacher') {
    role = 'teacher'
  } else if (requestedRole === 'admin') {
    role = 'admin'
  } else {
    role = 'student'
  }

  if (role === 'student' && gradeLevel && !VALID_GRADE_LEVELS.includes(gradeLevel)) {
    return json({ error: `Grado de estudiante inválido. Usa uno de: ${VALID_GRADE_LEVELS.join(', ')}` }, 400)
  }

  if (role === 'teacher') {
    const { data: existingTeacherProfile, error: existingTeacherProfileError } = await createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
      .from('profiles')
      .select('grade_level, assigned_grade_levels')
      .eq('id', id)
      .maybeSingle()

    if (existingTeacherProfileError) {
      return json({ error: existingTeacherProfileError.message }, 500)
    }

    const fallbackAssignedGrades = Array.isArray(existingTeacherProfile?.assigned_grade_levels)
      ? existingTeacherProfile.assigned_grade_levels.map((grade: unknown) => String(grade || '').trim()).filter(Boolean)
      : []

    const resolvedAssignedGrades = assignedGradeLevels.length > 0
      ? assignedGradeLevels
      : fallbackAssignedGrades.length > 0
      ? fallbackAssignedGrades
      : gradeLevel
      ? [gradeLevel]
      : []

    if (resolvedAssignedGrades.length === 0) {
      return json({ error: 'El profesor debe tener al menos un grado asignado' }, 400)
    }

    const invalidAssignedGrades = resolvedAssignedGrades.filter((grade) => !VALID_GRADE_LEVELS.includes(grade))
    if (invalidAssignedGrades.length > 0) {
      return json({ error: `Grados de profesor inválidos: ${invalidAssignedGrades.join(', ')}` }, 400)
    }

    body.assigned_grade_levels = resolvedAssignedGrades
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

  const { data: profileData, error: profileError } = await callerClient
    .from('profiles')
    .select('role')
    .eq('id', userData.user.id)
    .maybeSingle()

  const fallbackRole = userData.user.user_metadata?.role || userData.user.app_metadata?.role || null
  const effectiveRole = profileData?.role || fallbackRole

  if (profileError || effectiveRole !== 'admin') {
    return json({ error: 'Forbidden' }, 403)
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  const { data: existingProfile, error: existingProfileError } = await adminClient
    .from('profiles')
    .select('created_by, grade_level, assigned_grade_levels')
    .eq('id', id)
    .maybeSingle()

  if (existingProfileError) {
    return json({ error: existingProfileError.message }, 500)
  }

  const profilePayload: Record<string, unknown> = {
    id,
    email,
    full_name: fullName,
    role,
    created_by: role === 'teacher' ? null : existingProfile?.created_by || null,
  }

  if (role === 'student') {
    profilePayload.grade_level = gradeLevel || existingProfile?.grade_level || null
    if (!profilePayload.grade_level) {
      return json({ error: 'El estudiante debe tener un grado asignado' }, 400)
    }
  }

  if (role === 'teacher') {
    const resolvedAssignedGrades = normalizeGradeLevels(body?.assigned_grade_levels)
    profilePayload.assigned_grade_levels =
      resolvedAssignedGrades.length > 0
        ? resolvedAssignedGrades
        : Array.isArray(existingProfile?.assigned_grade_levels)
        ? existingProfile.assigned_grade_levels
        : []
  }

  const { error: profileUpsertError } = await adminClient.from('profiles').upsert(profilePayload, {
    onConflict: 'id',
  })

  if (profileUpsertError) {
    return json({ error: profileUpsertError.message }, 400)
  }

  const { error: authUpdateError } = await adminClient.auth.admin.updateUserById(id, {
    email,
    user_metadata: {
      full_name: fullName,
      role,
      ...(role === 'student' ? { grade_level: profilePayload.grade_level } : {}),
      ...(role === 'teacher' ? { assigned_grade_levels: profilePayload.assigned_grade_levels } : {}),
    },
  })

  if (authUpdateError) {
    return json({ error: authUpdateError.message }, 400)
  }

  return json({ success: true })
})
