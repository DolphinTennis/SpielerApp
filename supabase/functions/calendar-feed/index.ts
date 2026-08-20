// Liefert den Terminstand eines Teammitglieds als iCalendar aus — die Adresse,
// die eine Kalender-App abonniert. Kalender-Apps können sich nicht anmelden:
// sie rufen stur eine URL ab, ohne Sitzung, ohne Kopfzeilen. Deshalb steckt
// die Berechtigung im Token in der Adresse, und deshalb läuft diese Funktion
// mit verify_jwt = false (siehe supabase/config.toml), wie approve-registration.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { buildIcs, expandSessions, expandYearPlan, addDaysIso } from '../_shared/calendarFeed.ts'

const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

// Vergangenheit mit ausliefern, damit ein frisch abonnierter Kalender nicht
// leer wirkt, und ein Jahr voraus wie beim bisherigen Export.
const DAYS_BACK = 30
const DAYS_AHEAD = 365

// Ein einziger, nicht unterscheidbarer Fehler für "Token unbekannt",
// "Recht entzogen" und "Mitgliedschaft beendet". Verschiedene Antworten
// würden bestätigen, dass ein geratener Token existiert.
function notFound() {
  return new Response('Kalender nicht gefunden.', { status: 404, headers: { 'Content-Type': 'text/plain; charset=utf-8' } })
}

Deno.serve(async (req) => {
  const token = new URL(req.url).searchParams.get('token')
  if (!token || token.length < 32) return notFound()

  try {
    const { data: feed } = await admin
      .from('calendar_feed_tokens')
      .select('user_id, org_id')
      .eq('token', token)
      .maybeSingle()
    if (!feed) return notFound()

    const { data: membership } = await admin
      .from('memberships')
      .select('role, status')
      .eq('org_id', feed.org_id)
      .eq('user_id', feed.user_id)
      .maybeSingle()
    if (!membership || membership.status !== 'active') return notFound()

    // Dieselbe Regel wie in der Oberfläche, serverseitig nachgeprüft: das Recht
    // kann zurückgenommen worden sein, nachdem der Link verschickt wurde.
    const { data: maySubscribe } = await admin.rpc('role_has_permission', {
      target_org_id: feed.org_id,
      target_role: membership.role,
      perm_key: 'calendar_subscribe',
    })
    if (!maySubscribe) return notFound()

    const { data: withYearPlan } = await admin.rpc('role_has_permission', {
      target_org_id: feed.org_id,
      target_role: membership.role,
      perm_key: 'calendar_feed_yearplan',
    })

    const today = new Date().toISOString().slice(0, 10)
    const rangeStart = addDaysIso(today, -DAYS_BACK)
    const rangeEnd = addDaysIso(today, DAYS_AHEAD)

    const [{ data: org }, { data: sessions }, { data: exceptions }] = await Promise.all([
      admin.from('organizations').select('name, player_name').eq('id', feed.org_id).maybeSingle(),
      admin.from('training_sessions').select('*').eq('org_id', feed.org_id),
      admin.from('training_session_exceptions').select('*').eq('org_id', feed.org_id),
    ])

    const events = expandSessions(sessions || [], exceptions || [], rangeStart, rangeEnd)

    if (withYearPlan) {
      const { data: days } = await admin
        .from('year_plan_days')
        .select('id, date, category, note, status')
        .eq('org_id', feed.org_id)
        .gte('date', rangeStart)
        .lte('date', rangeEnd)
      events.push(...expandYearPlan(days || []))
    }

    events.sort((a, b) => a.start.localeCompare(b.start))

    const name = org?.player_name || org?.name || 'Dolphin Tennis'
    const ics = buildIcs(events, `${name} — Terminplanung`)

    return new Response(ics, {
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': 'inline; filename="terminplanung.ics"',
        // Ein abonnierter Kalender darf nicht aus einem Zwischenspeicher
        // beantwortet werden, sonst sieht der Abonnent Änderungen noch später
        // als ohnehin schon.
        'Cache-Control': 'no-store, max-age=0',
        // Der Export-Knopf der App holt dieselbe Adresse per fetch.
        'Access-Control-Allow-Origin': '*',
      },
    })
  } catch (err) {
    console.error('calendar-feed failed:', err instanceof Error ? err.message : err)
    return new Response('Kalender konnte nicht erzeugt werden.', {
      status: 500,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    })
  }
})
