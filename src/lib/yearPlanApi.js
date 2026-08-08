import { supabase } from './supabaseClient'

export async function listYearPlanDays(orgId, year) {
  const { data, error } = await supabase
    .from('year_plan_days')
    .select('id, date, category, note, status, created_by, created_by_label')
    .eq('org_id', orgId)
    .gte('date', `${year}-01-01`)
    .lte('date', `${year}-12-31`)
  if (error) throw error
  return data
}

// Used both to create a fresh entry and to save edits — status isn't set
// here at all, a DB trigger derives it from the acting user's role every
// time (see 006_year_plan.sql), so "confirm" is just "save unchanged".
export async function saveYearPlanDay({ orgId, date, category, note, userLabel }) {
  const { data, error } = await supabase
    .from('year_plan_days')
    .upsert({ org_id: orgId, date, category, note: note || null, created_by_label: userLabel }, { onConflict: 'org_id,date' })
    .select('id, date, category, note, status, created_by, created_by_label')
    .single()
  if (error) throw error
  return data
}

export async function deleteYearPlanDay(id) {
  const { error } = await supabase.from('year_plan_days').delete().eq('id', id)
  if (error) throw error
}
