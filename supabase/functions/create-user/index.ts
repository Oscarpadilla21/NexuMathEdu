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
    email?: string
    password?: string
    full_name?: string
    role?: string
    grade_level?: string
    assigned_grade_levels?: string[] | string
    assign_to_teacher_id?: string
  }

  try {
    body = await req.json()
  } catch {
    return json({ error: 'Invalid JSON body' }, 400)
  }

  const email = String(body?.email || '').trim().toLowerCase()
  const password = String(body?.password || '')
  const fullName = String(body?.full_name || '').trim()
  const requestedRole = String(body?.role || 'student')
  const gradeLevel = String(body?.grade_level || '').trim()
  const rawAssignedGradeLevels = body?.assigned_grade_levels
  const assignedGradeLevels = Array.isArray(rawAssignedGradeLevels)
    ? rawAssignedGradeLevels.map((grade: unknown) => String(grade || '').trim()).filter(Boolean)
    : typeof rawAssignedGradeLevels === 'string'
    ? rawAssignedGradeLevels.split(',').map((grade) => grade.trim()).filter(Boolean)
    : []
  const assignToTeacherId = String(body?.assign_to_teacher_id || '').trim()

  const VALID_GRADE_LEVELS = [
    'Sexto de bachillerato',
    'Septimo de bachillerato',
    'Octavo de bachillerato',
    'Noveno de bachillerato',
    'Decimo de bachillerato',
    'Undecimo de bachillerato',
  ]

  // Validate role
  let role: string
  if (requestedRole === 'teacher') {
    role = 'teacher'
  } else if (requestedRole === 'admin') {
    role = 'admin'
  } else {
    role = 'student'
  }

  if (!email || !password || !fullName) {
    return json({ error: 'Email, password and full_name are required' }, 400)
  }

  if (role === 'student') {
    if (!gradeLevel) {
      return json({ error: 'El estudiante debe tener un grado asignado' }, 400)
    }
    if (!VALID_GRADE_LEVELS.includes(gradeLevel)) {
      return json({ error: `Grado de estudiante inválido. Usa uno de: ${VALID_GRADE_LEVELS.join(', ')}` }, 400)
    }
  }

  if (role === 'teacher') {
    if (assignedGradeLevels.length === 0) {
      return json({ error: 'El profesor debe tener al menos un grado asignado' }, 400)
    }
    const invalidAssignedGrades = assignedGradeLevels.filter((grade) => !VALID_GRADE_LEVELS.includes(grade))
    if (invalidAssignedGrades.length > 0) {
      return json({ error: `Grados de profesor inválidos: ${invalidAssignedGrades.join(', ')}` }, 400)
    }
  }

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

  if (profileError || (effectiveRole !== 'admin' && effectiveRole !== 'teacher')) {
    return json({ error: 'Forbidden' }, 403)
  }

  // Permission checks based on role
  if (effectiveRole === 'teacher') {
    // Teachers can only create students
    if (requestedRole !== 'student') {
      return json({ error: 'Teachers can only create student accounts' }, 403)
    }
  } else if (effectiveRole === 'admin') {
    // Admins can create teachers, students, and admins
    // No restrictions
  }

  if (effectiveRole === 'teacher') {
    const { data: teacherProfile, error: teacherProfileError } = await callerClient
      .from('profiles')
      .select('assigned_grade_levels')
      .eq('id', userData.user.id)
      .maybeSingle()

    if (teacherProfileError) {
      return json({ error: teacherProfileError.message }, 500)
    }

    const teacherGrades = Array.isArray(teacherProfile?.assigned_grade_levels)
      ? teacherProfile.assigned_grade_levels.map((grade: unknown) => String(grade || '').trim()).filter(Boolean)
      : []

    if (teacherGrades.length === 0) {
      return json({ error: 'Tu cuenta de profesor debe tener al menos un grado asignado antes de crear estudiantes' }, 403)
    }

    if (role === 'student' && !teacherGrades.includes(gradeLevel)) {
      return json({ error: 'No puedes crear estudiantes fuera de los grados asignados a tu cuenta' }, 403)
    }
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  const { data: createdUser, error: createError } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: fullName,
      role,
      ...(role === 'student' ? { grade_level: gradeLevel } : {}),
      ...(role === 'teacher' ? { assigned_grade_levels: assignedGradeLevels } : {}),
    },
  })

  if (createError) {
    return json({ error: createError.message }, 400)
  }

  if (!createdUser?.user?.id) {
    return json({ error: 'User creation failed' }, 500)
  }

  // Determine created_by value
  let createdByValue: string | null = null

  if (effectiveRole === 'teacher') {
    // Teachers always assign to themselves
    createdByValue = userData.user.id
  } else if (effectiveRole === 'admin' && role === 'student') {
    if (assignToTeacherId) {
      const { data: teacherCheck, error: teacherCheckError } = await adminClient
        .from('profiles')
        .select('id, role, assigned_grade_levels')
        .eq('id', assignToTeacherId)
        .eq('role', 'teacher')
        .maybeSingle()

      if (teacherCheckError) {
        return json({ error: teacherCheckError.message }, 500)
      }

      if (!teacherCheck) {
        return json({ error: 'Profesor no encontrado para asignar el estudiante' }, 400)
      }

      if (!Array.isArray(teacherCheck.assigned_grade_levels) || teacherCheck.assigned_grade_levels.length === 0) {
        return json({ error: 'El profesor seleccionado no tiene grados asignados' }, 400)
      }

      if (!teacherCheck.assigned_grade_levels.includes(gradeLevel)) {
        return json({ error: 'El estudiante debe pertenecer a uno de los grados asignados al profesor seleccionado' }, 400)
      }

      createdByValue = assignToTeacherId
    }
    // If no teacher specified, created_by stays NULL so an admin can assign later
  }

  const profilePayload: Record<string, unknown> = {
    id: createdUser.user.id,
    email,
    full_name: fullName,
    role,
    created_by: role === 'student' ? createdByValue : null,
  }

  if (role === 'student') {
    profilePayload.grade_level = gradeLevel
  }

  if (role === 'teacher') {
    profilePayload.assigned_grade_levels = assignedGradeLevels
  }

  const { error: profileUpsertError } = await adminClient.from('profiles').upsert(profilePayload, {
    onConflict: 'id',
  })

  if (profileUpsertError) {
    return json({ error: profileUpsertError.message }, 400)
  }

  return json({
    user: {
      id: createdUser.user.id,
      email: createdUser.user.email,
      full_name: fullName,
      role,
    },
  })
})
