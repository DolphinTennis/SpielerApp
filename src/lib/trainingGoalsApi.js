import { supabase } from './supabaseClient'

const COLUMNS = 'id, org_id, match_id, category, content, created_by_label, created_at'

export async function listGoals(orgId) {
  const { data, error } = await supabase
    .from('training_goals')
    .select(COLUMNS)
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

async function upsertGoal({ orgId, matchId, category, content, userLabel }) {
  const { error } = await supabase
    .from('training_goals')
    .upsert(
      { org_id: orgId, match_id: matchId, category, content, created_by_label: userLabel },
      { onConflict: 'match_id,category' }
    )
  if (error) throw error
}

async function clearGoal(matchId, category) {
  const { error } = await supabase.from('training_goals').delete().eq('match_id', matchId).eq('category', category)
  if (error) throw error
}

// Called after a match is saved — keeps the checkable goal list in
// Terminplanung in sync with the match's zieleMatch/zieleTraining fields.
// An empty field clears that category's entry rather than storing a blank
// goal; the source match text is never modified by this.
export async function syncGoalsForMatch({ orgId, matchId, zieleMatch, zieleTraining, userLabel }) {
  await Promise.all([
    zieleMatch?.trim()
      ? upsertGoal({ orgId, matchId, category: 'match', content: zieleMatch.trim(), userLabel })
      : clearGoal(matchId, 'match'),
    zieleTraining?.trim()
      ? upsertGoal({ orgId, matchId, category: 'training', content: zieleTraining.trim(), userLabel })
      : clearGoal(matchId, 'training'),
  ])
}

// "Abhaken" — done means gone, not tracked as completed.
export async function deleteGoal(id) {
  const { error } = await supabase.from('training_goals').delete().eq('id', id)
  if (error) throw error
}
