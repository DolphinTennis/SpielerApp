// Translates a Matchanalyse's form1/form2 text fields into the caller's
// language via Azure Translator, caching the result on matches.translations
// so repeat views (and repeat calls for the same match+language) don't
// re-hit the API. RLS (not service_role) does the authorization here — the
// existing "Org members can update/view matches" policies already allow
// exactly what this function needs, so it runs entirely as the caller.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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

const AZURE_ENDPOINT = 'https://api.cognitive.microsofttranslator.com/translate'

async function translateTexts(texts: string[], targetLang: string): Promise<string[]> {
  const key = Deno.env.get('AZURE_TRANSLATOR_KEY')
  const region = Deno.env.get('AZURE_TRANSLATOR_REGION')
  if (!key || !region) {
    throw new Error('Übersetzungsdienst ist noch nicht eingerichtet (AZURE_TRANSLATOR_KEY/REGION fehlt).')
  }

  // Azure charges/limits per character and skips empty strings anyway —
  // keep a parallel index map so results can be spliced back into the
  // right slots without translating blanks.
  const nonEmpty = texts.map((t, i) => ({ i, t })).filter((x) => x.t.trim())
  if (nonEmpty.length === 0) return texts.map(() => '')

  const url = `${AZURE_ENDPOINT}?api-version=3.0&to=${encodeURIComponent(targetLang)}`
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Ocp-Apim-Subscription-Key': key,
      'Ocp-Apim-Subscription-Region': region,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(nonEmpty.map((x) => ({ Text: x.t }))),
  })
  if (!response.ok) {
    const errText = await response.text().catch(() => '')
    throw new Error(`Azure Translator Fehler (${response.status}): ${errText}`)
  }
  const data = await response.json()
  const result = texts.map(() => '')
  nonEmpty.forEach((x, idx) => {
    result[x.i] = data[idx]?.translations?.[0]?.text || ''
  })
  return result
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { matchId, lang } = await req.json()
    if (!matchId || !lang) {
      return json({ error: 'matchId und lang sind erforderlich.' }, 400)
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

    const { data: match, error: fetchError } = await asCaller
      .from('matches')
      .select('id, form1, form2, translations')
      .eq('id', matchId)
      .single()
    if (fetchError || !match) return json({ error: 'Match nicht gefunden oder keine Berechtigung.' }, 404)

    const cached = match.translations?.[lang]
    if (cached) return json(cached)

    const form1 = match.form1 || {}
    const form2 = match.form2 || {}
    const form1Keys = Object.keys(form1)
    const form2Keys = Object.keys(form2)
    const allTexts = [...form1Keys.map((k) => String(form1[k] || '')), ...form2Keys.map((k) => String(form2[k] || ''))]

    const translated = await translateTexts(allTexts, lang)

    const translatedForm1: Record<string, string> = {}
    form1Keys.forEach((k, i) => (translatedForm1[k] = translated[i]))
    const translatedForm2: Record<string, string> = {}
    form2Keys.forEach((k, i) => (translatedForm2[k] = translated[form1Keys.length + i]))

    const result = { form1: translatedForm1, form2: translatedForm2 }

    const nextTranslations = { ...(match.translations || {}), [lang]: result }
    const { error: updateError } = await asCaller.from('matches').update({ translations: nextTranslations }).eq('id', matchId)
    if (updateError) console.error('Failed to cache translation:', updateError)

    return json(result)
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : String(err) }, 500)
  }
})
