// Clicked directly from the owner's notification email (notify-registration)
// — no login involved. The token in the link *is* the authorization, same
// principle as Supabase's own confirmation links. GET only, returns a
// plain HTML page instead of JSON since a browser opens it directly.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

function html(body: string, status = 200) {
  return new Response(
    `<!doctype html><html lang="de"><head><meta charset="utf-8"><title>Dolphin Tennis</title></head>
    <body style="font-family:Arial,sans-serif;text-align:center;padding:60px 20px;color:#16232E;">${body}</body></html>`,
    { status, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
  )
}

Deno.serve(async (req) => {
  if (req.method !== 'GET') return html('<h1>Methode nicht erlaubt.</h1>', 405)

  const url = new URL(req.url)
  const orgId = url.searchParams.get('orgId')
  const token = url.searchParams.get('token')
  if (!orgId || !token) return html('<h1>Ungültiger Link.</h1>', 400)

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const admin = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

    const { data: org, error } = await admin
      .from('organizations')
      .select('id, name, approval_token, approved')
      .eq('id', orgId)
      .maybeSingle()

    if (error || !org || org.approval_token !== token) {
      return html('<h1>Ungültiger oder abgelaufener Link.</h1>', 403)
    }

    if (!org.approved) {
      const { error: updateError } = await admin.from('organizations').update({ approved: true }).eq('id', orgId)
      if (updateError) return html('<h1>Freigabe fehlgeschlagen.</h1><p>' + updateError.message + '</p>', 500)
    }

    return html(`<h1>✓ Team freigegeben</h1><p>„${org.name}" kann jetzt loslegen.</p>`)
  } catch (err) {
    return html('<h1>Fehler.</h1><p>' + (err instanceof Error ? err.message : String(err)) + '</p>', 500)
  }
})
