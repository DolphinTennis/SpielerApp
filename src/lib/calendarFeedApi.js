import { supabase } from './supabaseClient'
import { callFunction } from './callFunction'

// Der Abo-Link ist persönlich: die Zugriffsregeln auf calendar_feed_tokens
// (Migration 023) lassen ausdrücklich nur die eigene Zeile zu, nicht wie sonst
// alles im Team. Deshalb genügt hier die eigene Kennung — fremde Links sind
// gar nicht lesbar.
async function ownRow(userId, orgId) {
  const { data, error } = await supabase
    .from('calendar_feed_tokens')
    .select('token')
    .eq('user_id', userId)
    .eq('org_id', orgId)
    .maybeSingle()
  if (error) throw error
  return data
}

export async function ensureFeedToken(userId, orgId) {
  const vorhanden = await ownRow(userId, orgId)
  if (vorhanden) return vorhanden.token

  // token wird von der Datenbank erzeugt (encode(gen_random_bytes(24),'hex')),
  // nicht im Browser — der Zufall gehört auf die Serverseite.
  const { data, error } = await supabase
    .from('calendar_feed_tokens')
    .insert({ user_id: userId, org_id: orgId })
    .select('token')
    .single()
  if (error) throw error
  return data.token
}

// Löschen und neu anlegen statt Ändern: der Standardwert der Spalte erzeugt
// den neuen Zufallswert, und der alte Link ist im selben Moment tot.
export async function renewFeedToken(userId, orgId) {
  const { error } = await supabase.from('calendar_feed_tokens').delete().eq('user_id', userId).eq('org_id', orgId)
  if (error) throw error
  return ensureFeedToken(userId, orgId)
}

export function feedUrl(token) {
  return `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/calendar-feed?token=${token}`
}

// webcal:// öffnet auf iPad und Mac unmittelbar den Kalender mit der Frage,
// ob abonniert werden soll — mit https:// landet man stattdessen im Browser
// und bekommt eine Datei zum Herunterladen, also wieder nur eine Momentaufnahme.
export function webcalUrl(token) {
  return feedUrl(token).replace(/^https:\/\//, 'webcal://')
}

export async function sendCalendarLinkToTeam(orgId) {
  return callFunction('send-calendar-link', { orgId })
}
