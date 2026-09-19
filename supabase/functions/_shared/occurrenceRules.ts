// Entfaltet Terminregeln + Ausnahmen zu konkreten Terminen. EINE Quelle für
// beide Verbraucher:
//   - das Frontend (src/lib/trainingPlanOccurrences.js) für die Kalenderansicht
//   - der Abo-Dienst (_shared/calendarFeed.ts) für den iCalendar-Feed
// Früher gab es diese Logik zweimal, und jede Änderung musste an beiden Stellen
// nachgezogen werden. Deshalb hier bewusst ohne jede Abhängigkeit (kein i18n,
// kein React, kein Supabase), damit Vite und Deno sie gleichermaßen laden.

export interface RawOccurrence {
  session: any
  occurrenceDate: string // ursprünglich laut Regel geplantes Datum (Schlüssel der Ausnahme)
  exception: any | null
  startDate: string // tatsächlicher Beginn (nach Verschiebung)
  endDate: string // tatsächliches Ende (Beginn + Dauer in Tagen)
  startTime: string
  endTime: string
  spanDays: number
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

function matchesRule(session: any, iso: string) {
  if (iso < session.start_date) return false
  if (session.end_date && iso > session.end_date) return false
  return session.weekdays.includes(dateFromIso(iso).getDay())
}

// Alle Termine, die den Bereich [rangeStartIso, rangeEndIso] (inklusive,
// 'YYYY-MM-DD') berühren — auch solche, die davor beginnen und hineinreichen
// (mehrtägige Termine), und einzeln verschobene Termine, deren ursprüngliches
// Datum außerhalb des Bereichs liegt.
export function expandRawOccurrences(
  sessions: any[],
  exceptions: any[],
  rangeStartIso: string,
  rangeEndIso: string
): RawOccurrence[] {
  const exByKey = new Map<string, any>()
  const exBySession = new Map<string, any[]>()
  for (const ex of exceptions) {
    exByKey.set(`${ex.session_id}::${ex.occurrence_date}`, ex)
    const list = exBySession.get(ex.session_id)
    if (list) list.push(ex)
    else exBySession.set(ex.session_id, [ex])
  }

  const out: RawOccurrence[] = []

  const build = (session: any, occurrenceDate: string, exception: any | null) => {
    const startDate = exception?.override_date || occurrenceDate
    const spanDays = exception?.override_span_days ?? session.span_days ?? 0
    const endDate = addDaysIso(startDate, spanDays)
    if (startDate > rangeEndIso || endDate < rangeStartIso) return
    out.push({
      session,
      occurrenceDate,
      exception,
      startDate,
      endDate,
      startTime: exception?.override_start_time || session.start_time,
      endTime: exception?.override_end_time || session.end_time,
      spanDays,
    })
  }

  for (const session of sessions) {
    if (!session.weekdays || session.weekdays.length === 0) {
      build(session, session.start_date, null)
      continue
    }

    const exs = exBySession.get(session.id) || []
    const maxSpan = Math.max(session.span_days || 0, ...exs.map((e) => e.override_span_days ?? 0))
    const widenedStart = addDaysIso(rangeStartIso, -maxSpan)
    const loopStartIso = session.start_date > widenedStart ? session.start_date : widenedStart
    const loopEndIso = session.end_date && session.end_date < rangeEndIso ? session.end_date : rangeEndIso

    if (loopStartIso <= loopEndIso) {
      const cursor = dateFromIso(loopStartIso)
      const endCursor = dateFromIso(loopEndIso)
      while (cursor <= endCursor) {
        if (session.weekdays.includes(cursor.getDay())) {
          const iso = isoFromDate(cursor)
          const ex = exByKey.get(`${session.id}::${iso}`)
          if (!(ex && ex.cancelled)) build(session, iso, ex || null)
        }
        cursor.setDate(cursor.getDate() + 1)
      }
    }

    // Einzeln in den Bereich hinein verschobene Termine: ihr ursprüngliches
    // Datum liegt außerhalb der Schleife oben, sie würden sonst fehlen
    // (z. B. der Termin nächster Woche, der auf diesen Freitag vorgezogen wurde).
    for (const ex of exs) {
      if (ex.cancelled || !ex.override_date) continue
      if (ex.occurrence_date >= loopStartIso && ex.occurrence_date <= loopEndIso) continue
      if (!matchesRule(session, ex.occurrence_date)) continue
      build(session, ex.occurrence_date, ex)
    }
  }

  out.sort((a, b) => (a.startDate + 'T' + a.startTime).localeCompare(b.startDate + 'T' + b.startTime))
  return out
}
