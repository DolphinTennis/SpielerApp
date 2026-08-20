import { supabase } from './supabaseClient'

// Calling Edge Functions via plain fetch (rather than functions.invoke())
// so the Authorization header is exactly what we set — invoke() was
// silently not forwarding the caller's session token as expected.
//
// Lived as three byte-identical private copies in teamApi, matchesApi and
// mediaExamplesApi before; one place means one place to fix when the auth
// handling changes.
export async function callFunction(name, body) {
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
