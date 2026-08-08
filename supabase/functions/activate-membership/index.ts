// Flips the caller's own 'invited' membership to 'active' after they set a
// password in AcceptInvite.jsx. Runs with the service_role key rather than
// going through client-side RLS: activating your own invite is a narrow,
// well-defined operation, and self-referential RLS around "membership
// implies visibility, but you need visibility to gain membership" turned
// out to be unreliable in practice — this sidesteps that entirely.
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
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return json({ error: 'Nicht authentifiziert.' }, 401)

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const asCaller = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    })
    const jwt = authHeader.replace(/^Bearer\s+/i, '')
    const { data: userData } = await asCaller.auth.getUser(jwt)
    if (!userData.user) return json({ error: 'Nicht authentifiziert.' }, 401)

    const admin = createClient(supabaseUrl, serviceRoleKey)
    const { data, error } = await admin
      .from('memberships')
      .update({ status: 'active' })
      .eq('user_id', userData.user.id)
      .eq('status', 'invited')
      .select()

    if (error) return json({ error: error.message }, 400)
    if (!data || !data.length) return json({ error: 'Keine offene Einladung gefunden.' }, 404)

    return json({ success: true })
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : String(err) }, 500)
  }
})
