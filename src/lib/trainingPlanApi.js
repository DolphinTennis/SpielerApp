import { supabase } from './supabaseClient'

const SESSION_COLUMNS =
  'id, org_id, category, location, with_whom, note, start_time, end_time, weekdays, start_date, end_date, status, created_by, created_by_label'
const EXCEPTION_COLUMNS =
  'id, session_id, org_id, occurrence_date, cancelled, override_date, override_start_time, override_end_time, override_location, override_with_whom, override_note, status, created_by'

export async function listTrainingSessions(orgId) {
  const { data, error } = await supabase.from('training_sessions').select(SESSION_COLUMNS).eq('org_id', orgId)
  if (error) throw error
  return data
}

export async function listTrainingSessionExceptions(orgId) {
  const { data, error } = await supabase.from('training_session_exceptions').select(EXCEPTION_COLUMNS).eq('org_id', orgId)
  if (error) throw error
  return data
}

export async function createTrainingSession(payload) {
  const { data, error } = await supabase.from('training_sessions').insert(payload).select(SESSION_COLUMNS).single()
  if (error) throw error
  return data
}

export async function updateTrainingSession(id, payload) {
  const { data, error } = await supabase.from('training_sessions').update(payload).eq('id', id).select(SESSION_COLUMNS).single()
  if (error) throw error
  return data
}

export async function deleteTrainingSession(id) {
  const { error } = await supabase.from('training_sessions').delete().eq('id', id)
  if (error) throw error
}

// Cancel, reschedule/retime, or confirm a single occurrence of a recurring
// session — upsert on (session_id, occurrence_date) so re-saving the same
// occurrence (e.g. an admin's "Bestätigen") just updates the existing row.
export async function upsertTrainingSessionException(payload) {
  const { data, error } = await supabase
    .from('training_session_exceptions')
    .upsert(payload, { onConflict: 'session_id,occurrence_date' })
    .select(EXCEPTION_COLUMNS)
    .single()
  if (error) throw error
  return data
}

export async function deleteTrainingSessionException(id) {
  const { error } = await supabase.from('training_session_exceptions').delete().eq('id', id)
  if (error) throw error
}
