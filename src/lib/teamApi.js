import { supabase } from './supabaseClient'

export async function listMembers(orgId) {
  const { data, error } = await supabase
    .from('memberships')
    .select('id, user_id, role, status, email, created_at')
    .eq('org_id', orgId)
    .order('created_at')
  if (error) throw error
  return data
}

// Calling Edge Functions via plain fetch (rather than functions.invoke())
// so the Authorization header is exactly what we set — invoke() was
// silently not forwarding the caller's session token as expected.
async function callFunction(name, body) {
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) throw new Error('Nicht angemeldet.')

  const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${name}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify(body),
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.error || 'Anfrage fehlgeschlagen.')
  return data
}

export async function inviteMember({ email, role, orgId }) {
  const redirectTo = `${window.location.origin}/accept-invite`
  return callFunction('invite-member', { email, role, orgId, redirectTo })
}

// Runs server-side with service_role rather than a client-side RLS update —
// activating your own invited row ran into an unreliable self-referential
// RLS interaction (membership visibility requiring membership), so this is
// handled the same way invite-member handles its own privileged operations.
export async function activateOwnMembership() {
  return callFunction('activate-membership', {})
}
