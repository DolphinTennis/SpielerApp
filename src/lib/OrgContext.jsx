import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from './supabaseClient'
import { useAuth } from './AuthContext'

const OrgContext = createContext(null)

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
    supabase
      .from('memberships')
      .select('org_id, role, organizations(name, player_name)')
      .eq('user_id', session.user.id)
      .eq('status', 'active')
      .limit(1)
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) console.error(error)
        setMembership(data)
        setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [session])

  const value = {
    loading,
    orgId: membership?.org_id ?? null,
    role: membership?.role ?? null,
    orgName: membership?.organizations?.name ?? null,
    playerName: membership?.organizations?.player_name || '',
    isAdmin: membership?.role === 'spieler' || membership?.role === 'management',
  }

  return <OrgContext.Provider value={value}>{children}</OrgContext.Provider>
}

export function useOrg() {
  const ctx = useContext(OrgContext)
  if (!ctx) throw new Error('useOrg must be used within an OrgProvider')
  return ctx
}
