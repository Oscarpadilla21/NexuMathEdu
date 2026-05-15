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

async function getAllAuthUsers(adminClient: ReturnType<typeof createClient>) {
  const pageSize = 1000
  const allUsers = []
  let page = 1

  while (true) {
    const { data, error } = await adminClient.auth.admin.listUsers({
      page,
      perPage: pageSize,
    })

    if (error) {
      throw error
    }

    const users = data?.users || []
    allUsers.push(...users)

    if (users.length < pageSize) {
      break
    }

    page += 1
  }

  return allUsers
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

  const [authUsers, profilesResult] = await Promise.all([
    getAllAuthUsers(adminClient),
    adminClient.from('profiles').select('*').order('created_at', { ascending: false }),
  ])

  const profileRows = profilesResult.data || []
  const profileMap = new Map(profileRows.map((profile) => [profile.id, profile]))

  const users = authUsers.map((authUser) => {
    const profile = profileMap.get(authUser.id)

    return {
      id: authUser.id,
      email: authUser.email || profile?.email || '',
      full_name: profile?.full_name || authUser.user_metadata?.full_name || authUser.email || '',
      role: profile?.role || authUser.user_metadata?.role || authUser.app_metadata?.role || 'student',
      created_at: profile?.created_at || authUser.created_at,
      auth_created_at: authUser.created_at,
      has_profile: !!profile,
    }
  })

  return json({
    users,
    total: users.length,
    profiles_missing: users.filter((user) => !user.has_profile).length,
  })
})
