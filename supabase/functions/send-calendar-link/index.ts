// Verschickt jedem aktiven Teammitglied seinen EIGENEN Abo-Link für den
// Kalender. Persönliche Links, damit einer zurückgenommen werden kann, ohne
// alle anderen auszusperren — deshalb wird pro Person ein Token angelegt,
// falls noch keines besteht, und nie ein fremdes weitergegeben.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import nodemailer from 'npm:nodemailer@6.9.14'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { orgId } = await req.json()
    if (!orgId) return json({ error: 'orgId ist erforderlich.' }, 400)

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return json({ error: 'Nicht authentifiziert.' }, 401)

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    // Gegen die Sitzung des Aufrufers, damit die Zugriffsregeln die Wahrheit
    // über seine Mitgliedschaft sagen — gleiches Muster wie invite-member.
    const asCaller = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    })
    const jwt = authHeader.replace(/^Bearer\s+/i, '')
    const { data: userData } = await asCaller.auth.getUser(jwt)
    if (!userData.user) return json({ error: 'Nicht authentifiziert.' }, 401)

    const { data: caller } = await asCaller
      .from('memberships')
      .select('role')
      .eq('org_id', orgId)
      .eq('user_id', userData.user.id)
      .eq('status', 'active')
      .maybeSingle()
    if (!caller) return json({ error: 'Keine Berechtigung für dieses Team.' }, 403)

    const admin = createClient(supabaseUrl, serviceRoleKey)

    const { data: maysend } = await admin.rpc('role_has_permission', {
      target_org_id: orgId,
      target_role: caller.role,
      perm_key: 'calendar_subscribe',
    })
    if (!maysend) return json({ error: 'Keine Berechtigung, den Kalenderlink zu versenden.' }, 403)

    const { data: members } = await admin
      .from('memberships')
      .select('user_id, email, role')
      .eq('org_id', orgId)
      .eq('status', 'active')

    const { data: org } = await admin.from('organizations').select('name, player_name').eq('id', orgId).maybeSingle()
    const kalendername = org?.player_name || org?.name || 'Dolphin Tennis'

    const smtpPort = Number(Deno.env.get('MAILBOX_SMTP_PORT')!)
    const transporter = nodemailer.createTransport({
      host: Deno.env.get('MAILBOX_HOST')!,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: { user: Deno.env.get('MAILBOX_USER')!, pass: Deno.env.get('MAILBOX_PASSWORD')! },
    })

    const versendet: string[] = []
    const fehlgeschlagen: string[] = []

    for (const member of members || []) {
      if (!member.email) continue

      // Wer das Recht nicht hat, bekommt auch keinen Link — sonst verschickt
      // man Adressen, die beim Abruf ohnehin mit 404 antworten.
      const { data: darf } = await admin.rpc('role_has_permission', {
        target_org_id: orgId,
        target_role: member.role,
        perm_key: 'calendar_subscribe',
      })
      if (!darf) continue

      // Bestehendes Token behalten, sonst eines anlegen: ein erneuter Versand
      // darf laufende Abonnements nicht ungültig machen.
      let token: string | null = null
      const { data: vorhanden } = await admin
        .from('calendar_feed_tokens')
        .select('token')
        .eq('user_id', member.user_id)
        .eq('org_id', orgId)
        .maybeSingle()
      if (vorhanden) {
        token = vorhanden.token
      } else {
        const { data: angelegt, error } = await admin
          .from('calendar_feed_tokens')
          .insert({ user_id: member.user_id, org_id: orgId })
          .select('token')
          .single()
        if (error) {
          fehlgeschlagen.push(member.email)
          continue
        }
        token = angelegt.token
      }

      const feedUrl = `${supabaseUrl}/functions/v1/calendar-feed?token=${token}`
      const webcalUrl = feedUrl.replace(/^https:\/\//, 'webcal://')

      try {
        await transporter.sendMail({
          from: Deno.env.get('MAILBOX_USER')!,
          to: member.email,
          subject: `Kalender abonnieren: ${kalendername}`,
          html: `
            <div style="font-family:Arial,sans-serif;font-size:14px;color:#16232E;line-height:1.5;">
              <p>Hallo,</p>
              <p>hier ist dein persönlicher Link, um die Terminplanung von
                 <strong>${kalendername}</strong> als Kalender zu abonnieren.
                 Neue und verschobene Termine erscheinen dann von selbst.</p>
              <p style="margin:22px 0;">
                <a href="${webcalUrl}" style="background:#1C63B7;color:#fff;padding:11px 18px;border-radius:8px;text-decoration:none;">Kalender abonnieren</a>
              </p>
              <p style="font-size:13px;color:#5A6B78;">Falls der Knopf nicht funktioniert, diese Adresse in deiner
                 Kalender-App unter „Kalenderabonnement hinzufügen“ eintragen:<br>
                 <span style="word-break:break-all;">${feedUrl}</span></p>
              <p style="font-size:13px;color:#5A6B78;">Wie schnell Änderungen ankommen, entscheidet deine Kalender-App:
                 Apple Kalender lässt sich auf stündlich stellen, Google aktualisiert oft nur alle 12 bis 24 Stunden.</p>
              <p style="font-size:13px;color:#5A6B78;"><strong>Der Link ist persönlich.</strong> Wer ihn hat, sieht deine
                 Termine — bitte nicht weitergeben.</p>
            </div>`,
        })
        versendet.push(member.email)
      } catch (err) {
        console.error('send-calendar-link mail failed:', err instanceof Error ? err.message : err)
        fehlgeschlagen.push(member.email)
      }
    }

    return json({ versendet: versendet.length, fehlgeschlagen })
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : String(err) }, 500)
  }
})
