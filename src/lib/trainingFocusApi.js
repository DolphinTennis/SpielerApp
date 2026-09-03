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

// The table's own CHECK constraints (migration 014) are the last line of
// defence, but hitting them produces a bare "Speichern fehlgeschlagen" that
// says nothing about which field is at fault. Three inputs can get past the
// form today and be refused by the database:
//
//   datum = ''          -> 22007 invalid input syntax for type date: ""
//                          (clearing the date field yields an empty string)
//   energie_* outside 1..10, einsatz_prozent outside 0..100
//                       -> 23514 check constraint violated. The min/max on the
//                          number inputs only restrain the stepper arrows;
//                          a typed value walks straight through. Note that 0
//                          for energy is refused, which is easy to type.
//
// Returns an i18n key plus values, or null when the record is fine.
export function validateEntry(record) {
  if (!record.datum) return { key: 'trainingsfokus.validationDateMissing' }

  const ranges = [
    ['energie_mental', 1, 10, 'trainingsfokus.energyMental'],
    ['energie_physisch', 1, 10, 'trainingsfokus.energyPhysical'],
    ['einsatz_prozent', 0, 100, 'trainingsfokus.effort'],
  ]
  for (const [field, min, max, labelKey] of ranges) {
    const value = record[field]
    if (value === null || value === undefined || value === '') continue
    if (!Number.isFinite(value)) {
      return { key: 'trainingsfokus.validationRange', values: { labelKey, min, max } }
    }
    // Distinct from the range check on purpose: 80.1 lies well inside 0..100,
    // so "must be between 0 and 100" would read as wrong. The columns are
    // smallint (migration 014) — no fractional part at all, regardless of
    // range. The number inputs round on change, but this is the fallback for
    // anything that reaches here already fractional (paste, programmatic set).
    if (!Number.isInteger(value)) {
      return { key: 'trainingsfokus.validationInteger', values: { labelKey } }
    }
    if (value < min || value > max) {
      return { key: 'trainingsfokus.validationRange', values: { labelKey, min, max } }
    }
  }
  return null
}

export async function listEntries(orgId) {
  const { data, error } = await supabase
    .from('training_focus_entries')
    .select('id, datum, trainingsziel, filed, updated_at')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })
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
