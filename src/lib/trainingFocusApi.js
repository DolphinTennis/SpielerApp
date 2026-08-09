import { supabase } from './supabaseClient'

export function blankEntry(userId, orgId, spielerName = '') {
  return {
    user_id: userId,
    org_id: orgId,
    spieler: spielerName,
    datum: new Date().toISOString().slice(0, 10),
    energie_mental: null,
    energie_physisch: null,
    trainingsziel: '',
    geuebt: '',
    gut: '',
    verbessern: '',
    einsatz_prozent: null,
    filed: false,
  }
}

export async function listEntries(orgId) {
  const { data, error } = await supabase
    .from('training_focus_entries')
    .select('id, datum, trainingsziel, filed, updated_at')
    .eq('org_id', orgId)
    .order('datum', { ascending: false, nullsFirst: false })
  if (error) throw error
  return data
}

export async function getEntry(id) {
  const { data, error } = await supabase.from('training_focus_entries').select('*').eq('id', id).single()
  if (error) throw error
  return data
}

export async function createEntry(record) {
  const { data, error } = await supabase.from('training_focus_entries').insert(record).select().single()
  if (error) throw error
  return data
}

export async function updateEntry(id, patch) {
  const { data, error } = await supabase.from('training_focus_entries').update(patch).eq('id', id).select().single()
  if (error) throw error
  return data
}

export async function deleteEntry(id) {
  const { error } = await supabase.from('training_focus_entries').delete().eq('id', id)
  if (error) throw error
}
