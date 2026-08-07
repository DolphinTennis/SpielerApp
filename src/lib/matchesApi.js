import { supabase } from './supabaseClient'
import { blankForm1, blankForm2 } from '../config/matchFormFields'

export function blankMatch(userId) {
  return {
    user_id: userId,
    spieler: 'Naila Wieland',
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

export async function listMatches() {
  const { data, error } = await supabase
    .from('matches')
    .select('id, datum, gegner, turnier, ergebnis, filed, updated_at')
    .order('datum', { ascending: false, nullsFirst: false })
  if (error) throw error
  return data
}

export async function getMatch(id) {
  const { data, error } = await supabase.from('matches').select('*').eq('id', id).single()
  if (error) throw error
  return data
}

export async function createMatch(record) {
  const { data, error } = await supabase.from('matches').insert(record).select().single()
  if (error) throw error
  return data
}

export async function updateMatch(id, patch) {
  const { data, error } = await supabase.from('matches').update(patch).eq('id', id).select().single()
  if (error) throw error
  return data
}

export async function deleteMatch(id) {
  const { error } = await supabase.from('matches').delete().eq('id', id)
  if (error) throw error
}
