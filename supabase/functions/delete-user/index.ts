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
    user_id?: string
  }

  try {
    body = await req.json()
  } catch {
    return json({ error: 'Invalid JSON body' }, 400)
  }

  const userId = String(body?.user_id || '').trim()
  if (!userId) {
    return json({ error: 'user_id is required' }, 400)
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
    return json({ error: 'Only admins can delete users' }, 403)
  }

  // Prevent self-deletion
  if (userId === userData.user.id) {
    return json({ error: 'Cannot delete your own account' }, 400)
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  // Get user details
  const { data: userProfile } = await adminClient
    .from('profiles')
    .select('id, role, full_name')
    .eq('id', userId)
    .maybeSingle()

  if (!userProfile) {
    return json({ error: 'User not found' }, 404)
  }

  // If deleting a teacher, reassign their students to NULL
  if (userProfile.role === 'teacher') {
    await adminClient
      .from('profiles')
      .update({ created_by: null })
      .eq('created_by', userId)
      .eq('role', 'student')

    // Reassign their courses to NULL
    await adminClient
      .from('courses')
      .update({ teacher_id: null })
      .eq('teacher_id', userId)
  }

  // Delete auth user (cascade will delete profile)
  const { error: deleteError } = await adminClient.auth.admin.deleteUser(userId)

  if (deleteError) {
    return json({ error: deleteError.message }, 400)
  }

  return json({
    success: true,
    message: `Usuario ${userProfile.full_name} eliminado correctamente.`,
    deleted_user: userProfile,
  })
})
