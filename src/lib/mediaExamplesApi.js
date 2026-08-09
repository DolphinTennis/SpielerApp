import { supabase } from './supabaseClient'

const COLUMNS = 'id, url, platform, title, thumbnail_url, embed_html, note, created_by, created_by_label, created_at'

// Calling the Edge Function via plain fetch, same as teamApi.js's
// callFunction — functions.invoke() doesn't reliably forward the caller's
// session token in this project.
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

export async function listMediaExamples(orgId) {
  const { data, error } = await supabase
    .from('media_examples')
    .select(COLUMNS)
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function fetchLinkPreview(url) {
  return callFunction('link-preview', { url })
}

// Checks the shared mailbox for new links right now, instead of on a
// fixed schedule — called when the Beispiele page opens.
export async function checkMailbox() {
  return callFunction('email-inbound', {})
}

export async function addMediaExample({ orgId, url, note, userLabel, preview }) {
  const { data, error } = await supabase
    .from('media_examples')
    .insert({
      org_id: orgId,
      url,
      note: note || null,
      created_by_label: userLabel,
      platform: preview?.platform || 'other',
      title: preview?.title || null,
      thumbnail_url: preview?.thumbnail_url || null,
      embed_html: preview?.embed_html || null,
    })
    .select(COLUMNS)
    .single()
  if (error) throw error
  return data
}

export async function deleteMediaExample(id) {
  const { error } = await supabase.from('media_examples').delete().eq('id', id)
  if (error) throw error
}
