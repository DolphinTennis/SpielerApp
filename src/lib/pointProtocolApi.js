import { supabase } from './supabaseClient'

const LIST_COLUMNS = 'id, opponent, match_date, place, match_id, state, updated_at'

export async function listProtocols(orgId) {
  const { data, error } = await supabase
    .from('point_protocols')
    .select(LIST_COLUMNS)
    .eq('org_id', orgId)
    .order('match_date', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function getProtocol(id) {
  const { data, error } = await supabase.from('point_protocols').select('*').eq('id', id).single()
  if (error) throw error
  return data
}

// Ids der Matchanalysen, zu denen ein Punktprotokoll verknüpft ist (für das Kennzeichen in der Liste).
export async function listLinkedMatchIds(orgId) {
  const { data, error } = await supabase.from('point_protocols').select('match_id').eq('org_id', orgId).not('match_id', 'is', null)
  if (error) throw error
  return data.map((r) => r.match_id)
}

// Das Protokoll, das mit einer Matchanalyse verknüpft ist (oder null).
export async function getProtocolForMatch(matchId) {
  const { data, error } = await supabase.from('point_protocols').select('*').eq('match_id', matchId).maybeSingle()
  if (error) throw error
  return data
}

// Protokolle, die noch mit keiner Matchanalyse verknüpft sind — Auswahl zum Verknüpfen.
export async function listUnlinkedProtocols(orgId) {
  const { data, error } = await supabase
    .from('point_protocols')
    .select('id, opponent, match_date, place')
    .eq('org_id', orgId)
    .is('match_id', null)
    .order('match_date', { ascending: false, nullsFirst: false })
  if (error) throw error
  return data
}

function clean(patch) {
  return 'match_date' in patch && patch.match_date === '' ? { ...patch, match_date: null } : patch
}

export async function createProtocol(record) {
  const { data, error } = await supabase.from('point_protocols').insert(clean(record)).select().single()
  if (error) throw error
  return data
}

export async function updateProtocol(id, patch) {
  const { data, error } = await supabase.from('point_protocols').update(clean(patch)).eq('id', id).select().single()
  if (error) throw error
  return data
}

export async function saveProtocolState(id, games) {
  const { error } = await supabase.from('point_protocols').update({ state: { games } }).eq('id', id)
  if (error) throw error
}

export async function deleteProtocol(id) {
  const { error } = await supabase.from('point_protocols').delete().eq('id', id)
  if (error) throw error
}
