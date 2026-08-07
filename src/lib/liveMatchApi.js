import { supabase } from './supabaseClient'

export async function fetchLiveMatch(userId) {
  const { data, error } = await supabase.from('live_matches').select('state').eq('user_id', userId).maybeSingle()
  if (error) throw error
  return data?.state ?? null
}

export async function saveLiveMatch(userId, state) {
  const { error } = await supabase
    .from('live_matches')
    .upsert({ user_id: userId, state, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
  if (error) throw error
}

export async function clearLiveMatch(userId) {
  const { error } = await supabase
    .from('live_matches')
    .upsert({ user_id: userId, state: null, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
  if (error) throw error
}
