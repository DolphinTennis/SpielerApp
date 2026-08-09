import { CATEGORY_BY_KEY, WEEKDAYS, WEEKDAY_FULL_NAMES } from '../config/trainingPlanCategories'

function isoFromDate(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function dateFromIso(iso) {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function buildEvent(session, occurrenceDateIso, exception) {
  const cat = CATEGORY_BY_KEY[session.category]
  const effectiveDate = exception?.override_date || occurrenceDateIso
  const startTime = exception?.override_start_time || session.start_time
  const endTime = exception?.override_end_time || session.end_time
  const status = exception ? exception.status : session.status
  return {
    id: `${session.id}::${occurrenceDateIso}`,
    title: cat.label,
    start: `${effectiveDate}T${startTime}`,
    end: `${effectiveDate}T${endTime}`,
    color: cat.color,
    extendedProps: {
      sessionId: session.id,
      occurrenceDate: occurrenceDateIso,
      isRecurring: session.weekdays.length > 0,
      category: session.category,
      location: exception?.override_location ?? session.location,
      withWhom: exception?.override_with_whom ?? session.with_whom,
      note: exception?.override_note ?? session.note,
      status,
      hasException: !!exception,
      startTime,
      endTime,
    },
  }
}

// Turns session rules + exceptions into concrete dated FullCalendar events
// for [rangeStartIso, rangeEndIso] (inclusive, 'YYYY-MM-DD'). Pure function,
// no Supabase/React — recomputed client-side whenever the visible range or
// underlying data changes, instead of asking FullCalendar to understand
// recurrence (its built-in recurring events and the rrule plugin both lack
// a way to cancel/reschedule a single occurrence while keeping the rest of
// the series intact).
export function expandOccurrences(sessions, exceptions, rangeStartIso, rangeEndIso) {
  const exceptionMap = new Map()
  for (const ex of exceptions) {
    exceptionMap.set(`${ex.session_id}::${ex.occurrence_date}`, ex)
  }

  const events = []
  for (const session of sessions) {
    if (!session.weekdays || session.weekdays.length === 0) {
      if (session.start_date >= rangeStartIso && session.start_date <= rangeEndIso) {
        events.push(buildEvent(session, session.start_date, null))
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
        if (!(ex && ex.cancelled)) {
          events.push(buildEvent(session, iso, ex || null))
        }
      }
      cursor.setDate(cursor.getDate() + 1)
    }
  }

  events.sort((a, b) => a.start.localeCompare(b.start))
  return events
}

export function parseOccurrenceId(id) {
  const [sessionId, occurrenceDate] = id.split('::')
  return { sessionId, occurrenceDate }
}

export function formatWeekdays(weekdays) {
  if (!weekdays || weekdays.length === 0) return 'Einmalig'
  return WEEKDAYS.filter((w) => weekdays.includes(w.value)).map((w) => w.label).join(', ')
}

export function formatOccurrenceDateLong(iso) {
  const [y, m, d] = iso.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  return `${WEEKDAY_FULL_NAMES[date.getDay()]}, ${String(d).padStart(2, '0')}.${String(m).padStart(2, '0')}.${y}`
}

export function formatOccurrenceDateShort(iso) {
  const [y, m, d] = iso.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  const yy = String(y).slice(-2)
  return `${WEEKDAY_FULL_NAMES[date.getDay()]}, ${String(d).padStart(2, '0')}.${String(m).padStart(2, '0')}.${yy}`
}

export function formatTimeRange(startTime, endTime) {
  return `${startTime.slice(0, 5)}–${endTime.slice(0, 5)} Uhr`
}

export function todayIso() {
  return isoFromDate(new Date())
}

export function addDaysIso(iso, days) {
  const date = dateFromIso(iso)
  date.setDate(date.getDate() + days)
  return isoFromDate(date)
}
