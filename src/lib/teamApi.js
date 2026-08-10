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

// Removing a member is just deleting their membership row — RLS ("Members can
// delete memberships in their org") already lets an org admin do this directly,
// so no Edge Function is needed. For an invited-but-not-yet-active member this
// leaves their placeholder auth user orphaned, which is harmless (they simply
// lose team access); re-inviting the same address later goes through the
// resend flow below.
export async function removeMember(membershipId) {
  const { error } = await supabase.from('memberships').delete().eq('id', membershipId)
  if (error) throw error
}

export async function getRolePermissions(orgId) {
  const { data, error } = await supabase.from('organizations').select('role_permissions').eq('id', orgId).single()
  if (error) throw error
  return data.role_permissions
}

// Patch is merged into the existing role_permissions on the client before
// this is called (see TeamManage.jsx) — this just writes the full object.
export async function updateRolePermissions(orgId, rolePermissions) {
  const { error } = await supabase.from('organizations').update({ role_permissions: rolePermissions }).eq('id', orgId)
  if (error) throw error
}

export async function updatePlayerName(orgId, playerName) {
  const { error } = await supabase.from('organizations').update({ player_name: playerName }).eq('id', orgId)
  if (error) throw error
}

export async function updateTheme(orgId, theme) {
  const { error } = await supabase.from('organizations').update({ theme }).eq('id', orgId)
  if (error) throw error
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

// Always the real public app URL, never window.location.origin — inviting
// while developing locally would otherwise send invited members a link to
// the inviter's own localhost, which nobody else can reach.
export async function inviteMember({ email, role, orgId }) {
  const appUrl = import.meta.env.VITE_APP_URL || window.location.origin
  const redirectTo = `${appUrl}/accept-invite`
  return callFunction('invite-member', { email, role, orgId, redirectTo })
}

// Re-sends the invite email to an already-invited member. Needs service_role
// (Supabase's invite email can only be triggered server-side), so it goes
// through an Edge Function. The function regenerates a fresh invite for the
// membership's user, so the member id may change — callers should reload the
// member list afterwards rather than reuse the old row.
export async function resendInvite({ membershipId, orgId }) {
  const appUrl = import.meta.env.VITE_APP_URL || window.location.origin
  const redirectTo = `${appUrl}/accept-invite`
  return callFunction('resend-invite', { membershipId, orgId, redirectTo })
}

// Runs server-side with service_role rather than a client-side RLS update —
// activating your own invited row ran into an unreliable self-referential
// RLS interaction (membership visibility requiring membership), so this is
// handled the same way invite-member handles its own privileged operations.
export async function activateOwnMembership() {
  return callFunction('activate-membership', {})
}

// Fire-and-forget from OrgContext.jsx right after a new team is created —
// failure here shouldn't block onboarding, so callers should .catch() it.
export async function notifyRegistration(orgId) {
  return callFunction('notify-registration', { orgId })
}
