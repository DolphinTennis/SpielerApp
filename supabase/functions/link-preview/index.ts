// Fetches title/thumbnail for a YouTube/Instagram/TikTok/other link
// server-side (avoids CORS, keeps the oEmbed calls off the client). Never
// writes to the database — the client inserts the media_examples row
// itself via the normal RLS-protected path, this function is read-only.
// Auth is still checked so it can't be used as an open URL-fetch proxy.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getLinkPreview } from '../_shared/linkPreview.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { url } = await req.json()
    if (!url || typeof url !== 'string') {
      return json({ error: 'Bitte einen gültigen Link angeben.' }, 400)
    }

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return json({ error: 'Nicht authentifiziert.' }, 401)

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const asCaller = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    })
    const jwt = authHeader.replace(/^Bearer\s+/i, '')
    const { data: userData } = await asCaller.auth.getUser(jwt)
    if (!userData.user) return json({ error: 'Nicht authentifiziert.' }, 401)

    const preview = await getLinkPreview(url)
    return json(preview)
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : String(err) }, 500)
  }
})
