// Sends the owner an email with an approve-link whenever a new team
// self-registers (see Register.jsx -> provisionPendingTeam in
// OrgContext.jsx). Called right after the team/org is created, from a
// caller who is already a member of that org (RLS scopes the read).
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import nodemailer from 'npm:nodemailer@6.9.14'

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

// Fixed on purpose — this is a notification to the app owner, not a
// per-org configurable address.
const OWNER_EMAIL = 'sdwieland@gmail.com'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { orgId } = await req.json()
    if (!orgId) return json({ error: 'orgId ist erforderlich.' }, 400)

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

    // RLS ("Members can view their organizations") already limits this to
    // the caller's own org — no service_role needed.
    const { data: org, error: orgError } = await asCaller
      .from('organizations')
      .select('id, name, player_name, approval_token')
      .eq('id', orgId)
      .single()
    if (orgError || !org) return json({ error: 'Team nicht gefunden oder keine Berechtigung.' }, 404)

    const approveUrl = `${supabaseUrl}/functions/v1/approve-registration?orgId=${org.id}&token=${org.approval_token}`

    const smtpPort = Number(Deno.env.get('MAILBOX_SMTP_PORT')!)
    const transporter = nodemailer.createTransport({
      host: Deno.env.get('MAILBOX_HOST')!,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: {
        user: Deno.env.get('MAILBOX_USER')!,
        pass: Deno.env.get('MAILBOX_PASSWORD')!,
      },
    })

    await transporter.sendMail({
      from: Deno.env.get('MAILBOX_USER')!,
      to: OWNER_EMAIL,
      subject: `Neue Registrierung: ${org.name}`,
      html: `
        <div style="font-family:Arial,sans-serif;font-size:14px;color:#16232E;">
          <p>Ein neues Team hat sich registriert:</p>
          <p><strong>${org.name}</strong><br>Spieler: ${org.player_name || '–'}</p>
          <p><a href="${approveUrl}" style="display:inline-block;background:#D7F23D;color:#0F2740;font-weight:700;padding:10px 18px;border-radius:8px;text-decoration:none;">Team freigeben</a></p>
        </div>
      `,
    })

    return json({ success: true })
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : String(err) }, 500)
  }
})
