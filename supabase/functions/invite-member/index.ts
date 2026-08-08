// Invites a new member (management or trainer) into the caller's team.
// Runs with the service_role key (auto-injected by Supabase, never exposed
// to the browser) because inviting a user by email and pre-creating their
// membership row both require elevated privileges the anon key doesn't have.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { email, role, orgId, redirectTo } = await req.json()

    if (!email || !orgId || !['management', 'trainer'].includes(role)) {
      return json({ error: 'E-Mail, Rolle (management/trainer) und orgId sind erforderlich.' }, 400)
    }

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return json({ error: 'Nicht authentifiziert.' }, 401)

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    // Scoped to the caller's own JWT, so RLS tells us the truth about their
    // membership/role instead of trusting whatever the client claims. Auth
    // persistence/refresh is disabled because this is a stateless, one-shot
    // server context — with it left on, getUser() tries to consult a local
    // session that can never exist here and fails with "Auth session missing!"
    // even when a valid jwt is passed in directly.
    const asCaller = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    })

    const jwt = authHeader.replace(/^Bearer\s+/i, '')
    const { data: userData } = await asCaller.auth.getUser(jwt)
    if (!userData.user) return json({ error: 'Nicht authentifiziert.' }, 401)
    const user = userData.user

    const { data: callerMembership } = await asCaller
      .from('memberships')
      .select('role')
      .eq('org_id', orgId)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .maybeSingle()

    if (!callerMembership || !['spieler', 'management'].includes(callerMembership.role)) {
      return json({ error: 'Keine Berechtigung, Mitglieder für dieses Team einzuladen.' }, 403)
    }

    const admin = createClient(supabaseUrl, serviceRoleKey)

    const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
      redirectTo: redirectTo || undefined,
    })
    if (inviteError) return json({ error: inviteError.message }, 400)

    const { error: membershipError } = await admin.from('memberships').insert({
      org_id: orgId,
      user_id: invited.user.id,
      role,
      status: 'invited',
      email,
    })
    if (membershipError) {
      // Most common case: this person already has a membership somewhere
      // (unique org_id/user_id constraint) or in this org specifically.
      return json({ error: membershipError.message }, 400)
    }

    return json({ success: true })
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : String(err) }, 500)
  }
})
