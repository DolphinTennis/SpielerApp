// Re-sends the invite email to a member who was invited but hasn't accepted
// yet. Supabase's inviteUserByEmail refuses an address that already exists in
// auth.users, so a plain re-invite fails. Instead we delete the stale
// placeholder auth user (which cascade-deletes their membership row) and
// invite the address fresh, producing a brand-new invite email. Runs with the
// service_role key because both admin operations require elevated privileges
// the anon key doesn't have.
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
    const { membershipId, orgId, redirectTo } = await req.json()

    if (!membershipId || !orgId) {
      return json({ error: 'membershipId und orgId sind erforderlich.' }, 400)
    }

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return json({ error: 'Nicht authentifiziert.' }, 401)

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    // Scoped to the caller's JWT so RLS decides what they may see/do, rather
    // than trusting the client. (Same rationale as invite-member.)
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

    if (!callerMembership) {
      return json({ error: 'Keine Berechtigung, Einladungen für dieses Team zu verwalten.' }, 403)
    }

    const { data: canInvite } = await asCaller.rpc('role_has_permission', {
      target_org_id: orgId,
      target_role: callerMembership.role,
      perm_key: 'invite_members',
    })
    if (!canInvite) {
      return json({ error: 'Keine Berechtigung, Einladungen für dieses Team zu verwalten.' }, 403)
    }

    const admin = createClient(supabaseUrl, serviceRoleKey)

    // Load the target membership with the service role, then re-check that it
    // belongs to the caller's org — never trust the orgId/membershipId pairing
    // from the client on its own.
    const { data: target, error: targetError } = await admin
      .from('memberships')
      .select('id, org_id, user_id, role, status, email')
      .eq('id', membershipId)
      .maybeSingle()

    if (targetError) return json({ error: targetError.message }, 400)
    if (!target || target.org_id !== orgId) {
      return json({ error: 'Mitglied nicht gefunden.' }, 404)
    }
    if (target.status !== 'invited') {
      return json({ error: 'Dieses Mitglied hat die Einladung bereits angenommen.' }, 400)
    }
    if (!target.email) {
      return json({ error: 'Für dieses Mitglied ist keine E-Mail hinterlegt.' }, 400)
    }

    // Delete the stale placeholder auth user; the membership row goes with it
    // via the on-delete-cascade FK, so we start from a clean slate.
    const { error: deleteError } = await admin.auth.admin.deleteUser(target.user_id)
    if (deleteError) return json({ error: deleteError.message }, 400)

    const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(target.email, {
      redirectTo: redirectTo || undefined,
    })
    if (inviteError) return json({ error: inviteError.message }, 400)

    const { error: membershipError } = await admin.from('memberships').insert({
      org_id: orgId,
      user_id: invited.user.id,
      role: target.role,
      status: 'invited',
      email: target.email,
    })
    if (membershipError) return json({ error: membershipError.message }, 400)

    return json({ success: true })
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : String(err) }, 500)
  }
})
