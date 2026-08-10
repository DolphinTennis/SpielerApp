import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from './supabaseClient'
import { useAuth } from './AuthContext'
import { activateOwnMembership, notifyRegistration } from './teamApi'

const OrgContext = createContext(null)

async function fetchMembership(userId) {
  const { data, error } = await supabase
    .from('memberships')
    .select('org_id, role, organizations(name, player_name, role_permissions, theme, approved)')
    .eq('user_id', userId)
    .eq('status', 'active')
    .limit(1)
    .maybeSingle()
  if (error) throw error
  return data
}

const FULL_PERMISSIONS = {
  manage_permissions: true,
  invite_members: true,
  year_plan_entries: true,
  year_plan_auto_confirm: true,
  calendar_entries: true,
  calendar_auto_confirm: true,
  confirm_termine: true,
  visible_tiles: null,
}

// spieler is always full access, regardless of what's stored — matches the
// role_has_permission() DB function's rule (see 015_role_permissions.sql).
function derivePermissions(role, rolePermissions) {
  if (role === 'spieler') return FULL_PERMISSIONS
  return rolePermissions?.[role] || {}
}

// After Register.jsx signs a new user up, no session exists yet (email
// confirmation pending), so the team can't be created then — RLS requires
// auth.uid(). Instead the team/player name is stashed in the auth user's
// metadata, and this runs it once a session finally exists (first login).
async function provisionPendingTeam(session) {
  const meta = session.user.user_metadata || {}
  if (!meta.pending_team_name) return null

  // The org's id is generated client-side (rather than via .select() after
  // insert) because the organizations SELECT policy requires org membership
  // — which can't exist yet at this point, so reading the row straight back
  // would itself get rejected by RLS.
  const orgId = crypto.randomUUID()
  const { error: orgError } = await supabase
    .from('organizations')
    .insert({ id: orgId, name: meta.pending_team_name, player_name: meta.pending_player_name || '' })
  if (orgError) throw orgError

  const { error: membershipError } = await supabase.from('memberships').insert({
    org_id: orgId,
    user_id: session.user.id,
    role: meta.pending_role || 'spieler',
    status: 'active',
    email: session.user.email,
  })
  if (membershipError) throw membershipError

  await supabase.auth.updateUser({
    data: { pending_team_name: null, pending_player_name: null, pending_role: null },
  })

  // Doesn't block onboarding if it fails — the owner can always approve
  // manually later once they notice; this is just the fast path.
  notifyRegistration(orgId).catch((err) => console.error(err))

  return fetchMembership(session.user.id)
}

// Covers the invited-member path: AcceptInvite.jsx already activates the
// membership right after the password is set, but retrying here on every
// login is a cheap safety net in case that step got interrupted.
async function activateInvitedMembership(userId) {
  try {
    await activateOwnMembership()
  } catch {
    return null // no pending invite for this user — that's fine, not an error
  }
  return fetchMembership(userId)
}

export function OrgProvider({ children }) {
  const { session } = useAuth()
  const [membership, setMembership] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!session) {
      setMembership(null)
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)

    fetchMembership(session.user.id)
      .then((data) => (data ? data : provisionPendingTeam(session)))
      .then((data) => (data ? data : activateInvitedMembership(session.user.id)))
      .then((data) => {
        if (!cancelled) setMembership(data)
      })
      .catch((err) => {
        console.error(err)
        if (!cancelled) setMembership(null)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [session])

  const theme = membership?.organizations?.theme || 'hardcourt'

  useEffect(() => {
    document.documentElement.dataset.theme = theme
  }, [theme])

  const value = {
    loading,
    orgId: membership?.org_id ?? null,
    role: membership?.role ?? null,
    orgName: membership?.organizations?.name ?? null,
    playerName: membership?.organizations?.player_name || '',
    isAdmin: membership?.role === 'spieler' || membership?.role === 'management',
    permissions: derivePermissions(membership?.role, membership?.organizations?.role_permissions),
    theme,
    approved: membership?.organizations?.approved ?? true,
  }

  return <OrgContext.Provider value={value}>{children}</OrgContext.Provider>
}

export function useOrg() {
  const ctx = useContext(OrgContext)
  if (!ctx) throw new Error('useOrg must be used within an OrgProvider')
  return ctx
}
