import { useEffect } from 'react'
import i18n from '../i18n'
import { useAuth } from './AuthContext'
import { supabase } from './supabaseClient'

// Stored on the auth user (not the org) — language is a personal
// preference, unlike the team-wide theme in OrgContext.
export function useLanguage() {
  const { session } = useAuth()
  const language = session?.user?.user_metadata?.language || 'de'

  useEffect(() => {
    if (i18n.language !== language) i18n.changeLanguage(language)
  }, [language])

  async function setLanguage(code) {
    const { error } = await supabase.auth.updateUser({ data: { language: code } })
    if (error) throw error
  }

  return { language, setLanguage }
}
