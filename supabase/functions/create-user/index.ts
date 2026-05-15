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
  const role = requestedRole === 'teacher' ? 'teacher' : 'student'

  if (!email || !password || !fullName) {
    return json({ error: 'Email, password and full_name are required' }, 400)
  }

  if (requestedRole === 'admin') {
    return json({ error: 'Admin role cannot be assigned here' }, 400)
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

  if (profileError || profileData?.role !== 'admin') {
    return json({ error: 'Forbidden' }, 403)
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
    },
  })

  if (createError) {
    return json({ error: createError.message }, 400)
  }

  if (!createdUser?.user?.id) {
    return json({ error: 'User creation failed' }, 500)
  }

  const { error: profileUpsertError } = await adminClient.from('profiles').upsert(
    {
      id: createdUser.user.id,
      email,
      full_name: fullName,
      role,
    },
    {
      onConflict: 'id',
    }
  )

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
