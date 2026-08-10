import { supabase } from './supabaseClient'
import { blankForm1, blankForm2 } from '../config/matchFormFields'

export function blankMatch(userId, orgId, spielerName = '') {
  return {
    user_id: userId,
    org_id: orgId,
    spieler: spielerName,
    datum: '',
    gegner: '',
    ergebnis: '',
    turnier: '',
    verlauf: '',
    filed: false,
    form1: blankForm1(),
    form2: blankForm2(),
  }
}

export async function listMatches(orgId) {
  const { data, error } = await supabase
    .from('matches')
    .select('id, datum, gegner, turnier, ergebnis, filed, updated_at')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function getMatch(id) {
  const { data, error } = await supabase.from('matches').select('*').eq('id', id).single()
  if (error) throw error
  return data
}

// Postgres `date` columns reject "" (only null or a real date), but the
// editor and the live-ticker handoff both leave datum as "" when unset.
function normalizeDate(record) {
  return record.datum === '' ? { ...record, datum: null } : record
}

export async function createMatch(record) {
  const { data, error } = await supabase.from('matches').insert(normalizeDate(record)).select().single()
  if (error) throw error
  return data
}

export async function updateMatch(id, patch) {
  const { data, error } = await supabase.from('matches').update(normalizeDate(patch)).eq('id', id).select().single()
  if (error) throw error
  return data
}

export async function deleteMatch(id) {
  const { error } = await supabase.from('matches').delete().eq('id', id)
  if (error) throw error
}

// Calling the Edge Function via plain fetch (rather than functions.invoke())
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

// Returns { form1: {...translated}, form2: {...translated} } for the given
// target language — cached server-side on matches.translations after the
// first call for that language.
export async function translateMatch(matchId, lang) {
  return callFunction('translate-match', { matchId, lang })
}
