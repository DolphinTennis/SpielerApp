// Baut den iCalendar-Text für das Kalenderabonnement.
//
// ACHTUNG, Doppelung: expandOccurrences() gibt es auch im Frontend
// (src/lib/trainingPlanOccurrences.js), wo dieselbe Logik die Kalenderansicht
// speist. Beide müssen zusammenpassen — wird die Wiederholungs- oder
// Ausnahmebehandlung dort geändert, gehört sie hier nachgezogen. Vermeidbar
// wäre die Doppelung nur, indem man die Entfaltung in die Datenbank verlegt.
//
// Der ICS-Bau dagegen liegt NUR hier: der Export-Knopf im Frontend lädt
// dieselbe Adresse herunter, damit Datei und Abonnement nie auseinanderlaufen.

// Kein i18n auf dem Server: ein Abonnement weiß nicht, welche Sprache die
// Kalender-App des Empfängers spricht. Deutsch wie in src/locales/de.json.
const TRAINING_LABELS: Record<string, string> = {
  tennis: 'Tennis',
  kondi: 'Kondi',
  physio: 'Physio',
  mental: 'Mental',
  spiel: 'Spiel',
  turnier_national: 'Turnier national',
  turnier_international: 'Turnier international',
  sonstiges: 'Sonstiges',
}

const YEAR_PLAN_LABELS: Record<string, string> = {
  turnier_national: 'Turnier national',
  turnier_international: 'Turnier international',
  training: 'Training',
  ferien: 'Ferien',
  sonstiges: 'Sonstiges',
}

export interface FeedEvent {
  uid: string
  title: string
  start: string
  end: string
  allDay: boolean
  location?: string | null
  description?: string | null
}

function pad(n: number | string) {
  return String(n).padStart(2, '0')
}

function isoFromDate(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

function dateFromIso(iso: string) {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function addDaysIso(iso: string, days: number) {
  const d = dateFromIso(iso)
  d.setDate(d.getDate() + days)
  return isoFromDate(d)
}

// "2026-08-13T17:00" -> "20260813T170000". Ohne Zeitzone (schwebende Zeit),
// die jede Kalender-App in der Zone des Geräts auslegt — dieselbe Regel wie
// im bisherigen Export.
function toIcsDateTime(isoLocal: string) {
  const [datePart, timePart] = isoLocal.split('T')
  const [y, m, d] = datePart.split('-')
  const [hh, mm, ss] = (timePart || '00:00:00').split(':')
  return `${y}${m}${d}T${pad(hh)}${pad(mm)}${pad(ss || '00')}`
}

function toIcsDate(iso: string) {
  return iso.replace(/-/g, '')
}

function escapeIcsText(text: unknown) {
  return String(text || '')
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n')
}

// RFC 5545 erlaubt höchstens 75 Oktett pro Zeile; längere werden mit einem
// führenden Leerzeichen fortgesetzt. Ohne das lehnen manche Kalender lange
// Notizen oder Titel ab.
function foldLine(line: string) {
  if (line.length <= 74) return line
  const parts = [line.slice(0, 74)]
  let rest = line.slice(74)
  while (rest.length > 73) {
    parts.push(' ' + rest.slice(0, 73))
    rest = rest.slice(73)
  }
  if (rest.length) parts.push(' ' + rest)
  return parts.join('\r\n')
}

function nowStamp() {
  const d = new Date()
  return (
    d.getUTCFullYear() +
    pad(d.getUTCMonth() + 1) +
    pad(d.getUTCDate()) +
    'T' +
    pad(d.getUTCHours()) +
    pad(d.getUTCMinutes()) +
    pad(d.getUTCSeconds()) +
    'Z'
  )
}

// Wiederholungsregeln + Ausnahmen zu konkreten Terminen im Bereich
// [rangeStartIso, rangeEndIso]. Spiegelbild von expandOccurrences() im
// Frontend, siehe Hinweis oben.
export function expandSessions(
  sessions: any[],
  exceptions: any[],
  rangeStartIso: string,
  rangeEndIso: string
): FeedEvent[] {
  const exceptionMap = new Map<string, any>()
  for (const ex of exceptions) exceptionMap.set(`${ex.session_id}::${ex.occurrence_date}`, ex)

  const events: FeedEvent[] = []

  const push = (session: any, occurrenceDateIso: string, exception: any) => {
    const effectiveDate = exception?.override_date || occurrenceDateIso
    const startTime = exception?.override_start_time || session.start_time
    const endTime = exception?.override_end_time || session.end_time
    const location = exception?.override_location ?? session.location
    const withWhom = exception?.override_with_whom ?? session.with_whom
    const note = exception?.override_note ?? session.note
    const status = exception ? exception.status : session.status
    const label = TRAINING_LABELS[session.category] || session.category
    const description = [
      withWhom ? `Mit ${withWhom}` : null,
      note || null,
      // Vorschläge sind noch nicht bestätigt — im Kalender muss man das sehen,
      // sonst plant jemand auf einen Termin hin, den es vielleicht nicht gibt.
      status === 'proposed' ? 'Noch nicht bestätigt' : null,
    ]
      .filter(Boolean)
      .join(' — ')

    events.push({
      uid: `${session.id}::${occurrenceDateIso}@dolphintennis`,
      title: status === 'proposed' ? `${label} (Vorschlag)` : label,
      start: `${effectiveDate}T${startTime}`,
      end: `${effectiveDate}T${endTime}`,
      allDay: false,
      location,
      description,
    })
  }

  for (const session of sessions) {
    if (!session.weekdays || session.weekdays.length === 0) {
      if (session.start_date >= rangeStartIso && session.start_date <= rangeEndIso) {
        push(session, session.start_date, null)
      }
      continue
    }

    const loopStartIso = session.start_date > rangeStartIso ? session.start_date : rangeStartIso
    const loopEndIso = session.end_date && session.end_date < rangeEndIso ? session.end_date : rangeEndIso
    if (loopStartIso > loopEndIso) continue

    const cursor = dateFromIso(loopStartIso)
    const endDate = dateFromIso(loopEndIso)
    while (cursor <= endDate) {
      if (session.weekdays.includes(cursor.getDay())) {
        const iso = isoFromDate(cursor)
        const ex = exceptionMap.get(`${session.id}::${iso}`)
        if (!(ex && ex.cancelled)) push(session, iso, ex || null)
      }
      cursor.setDate(cursor.getDate() + 1)
    }
  }

  return events
}

// Jahresplanung: ein Eintrag pro Tag, also ganztägige Termine. DTEND ist bei
// ganztägigen Terminen der Folgetag (RFC 5545 zählt das Ende exklusiv) —
// sonst zeigen Kalender den Tag davor an.
export function expandYearPlan(days: any[]): FeedEvent[] {
  return days.map((d) => ({
    uid: `yearplan-${d.id}@dolphintennis`,
    title: YEAR_PLAN_LABELS[d.category] || d.category,
    start: d.date,
    end: addDaysIso(d.date, 1),
    allDay: true,
    location: null,
    description: [d.note || null, d.status === 'proposed' ? 'Noch nicht bestätigt' : null].filter(Boolean).join(' — '),
  }))
}

export function buildIcs(events: FeedEvent[], calendarName: string) {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Dolphin Tennis//Terminplanung//DE',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    // Von Apple und Google gelesen, damit das Abonnement einen Namen trägt
    // statt als "Unbenannt" in der Liste zu stehen.
    `X-WR-CALNAME:${escapeIcsText(calendarName)}`,
    'X-WR-TIMEZONE:Europe/Berlin',
    // Bitte um stündliche Aktualisierung. Apple hält sich meist daran, Google
    // ignoriert es und aktualisiert nach eigenem Rhythmus.
    'REFRESH-INTERVAL;VALUE=DURATION:PT1H',
    'X-PUBLISHED-TTL:PT1H',
  ]
  const stamp = nowStamp()

  for (const ev of events) {
    lines.push('BEGIN:VEVENT', `UID:${ev.uid}`, `DTSTAMP:${stamp}`)
    if (ev.allDay) {
      lines.push(`DTSTART;VALUE=DATE:${toIcsDate(ev.start)}`, `DTEND;VALUE=DATE:${toIcsDate(ev.end)}`)
    } else {
      lines.push(`DTSTART:${toIcsDateTime(ev.start)}`, `DTEND:${toIcsDateTime(ev.end)}`)
    }
    lines.push(foldLine(`SUMMARY:${escapeIcsText(ev.title)}`))
    if (ev.location) lines.push(foldLine(`LOCATION:${escapeIcsText(ev.location)}`))
    if (ev.description) lines.push(foldLine(`DESCRIPTION:${escapeIcsText(ev.description)}`))
    lines.push('END:VEVENT')
  }

  lines.push('END:VCALENDAR')
  return lines.join('\r\n')
}
