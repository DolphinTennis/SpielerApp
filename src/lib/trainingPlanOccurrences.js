import i18n from '../i18n'
import { CATEGORY_BY_KEY, WEEKDAYS } from '../config/trainingPlanCategories'

import { expandRawOccurrences } from '../../supabase/functions/_shared/occurrenceRules.ts'

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

function buildEvent(o) {
  const { session, exception, occurrenceDate } = o
  const cat = CATEGORY_BY_KEY[session.category]
  const status = exception ? exception.status : session.status
  return {
    id: `${session.id}::${occurrenceDate}`,
    title: i18n.t(cat.labelKey),
    start: `${o.startDate}T${o.startTime}`,
    end: `${o.endDate}T${o.endTime}`,
    color: cat.color,
    extendedProps: {
      sessionId: session.id,
      occurrenceDate,
      isRecurring: session.weekdays.length > 0,
      category: session.category,
      location: exception?.override_location ?? session.location,
      withWhom: exception?.override_with_whom ?? session.with_whom,
      note: exception?.override_note ?? session.note,
      status,
      hasException: !!exception,
      startTime: o.startTime,
      endTime: o.endTime,
      startDate: o.startDate,
      endDate: o.endDate,
      spanDays: o.spanDays,
    },
  }
}

// Turns session rules + exceptions into concrete dated FullCalendar events
// for [rangeStartIso, rangeEndIso] (inclusive, 'YYYY-MM-DD'). Pure function,
// no Supabase/React — recomputed client-side whenever the visible range or
// underlying data changes, instead of asking FullCalendar to understand
// recurrence (its built-in recurring events and the rrule plugin both lack
// a way to cancel/reschedule a single occurrence while keeping the rest of
// the series intact). The expansion itself lives in
// supabase/functions/_shared/occurrenceRules.ts, shared with the calendar
// feed so both always agree.
export function expandOccurrences(sessions, exceptions, rangeStartIso, rangeEndIso) {
  return expandRawOccurrences(sessions, exceptions, rangeStartIso, rangeEndIso).map(buildEvent)
}

export function parseOccurrenceId(id) {
  const [sessionId, occurrenceDate] = id.split('::')
  return { sessionId, occurrenceDate }
}

export function formatWeekdays(weekdays) {
  if (!weekdays || weekdays.length === 0) return i18n.t('calendar.oneTime')
  return WEEKDAYS.filter((w) => weekdays.includes(w.value)).map((w) => i18n.t(w.labelKey)).join(', ')
}

export function formatOccurrenceDateLong(iso) {
  const [y, m, d] = iso.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  const weekdaysFull = i18n.t('calendar.weekdaysFull', { returnObjects: true })
  return `${weekdaysFull[date.getDay()]}, ${String(d).padStart(2, '0')}.${String(m).padStart(2, '0')}.${y}`
}

export function formatOccurrenceDateShort(iso) {
  const [y, m, d] = iso.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  const yy = String(y).slice(-2)
  const weekdaysFull = i18n.t('calendar.weekdaysFull', { returnObjects: true })
  return `${weekdaysFull[date.getDay()]}, ${String(d).padStart(2, '0')}.${String(m).padStart(2, '0')}.${yy}`
}

export function formatTimeRange(startTime, endTime) {
  return i18n.t('calendar.timeRange', { start: startTime.slice(0, 5), end: endTime.slice(0, 5) })
}

export function todayIso() {
  return isoFromDate(new Date())
}

export function addDaysIso(iso, days) {
  const date = dateFromIso(iso)
  date.setDate(date.getDate() + days)
  return isoFromDate(date)
}

// Ganze Tage von fromIso bis toIso (negativ, wenn toIso davor liegt).
export function daysBetweenIso(fromIso, toIso) {
  const [fy, fm, fd] = fromIso.split('-').map(Number)
  const [ty, tm, td] = toIso.split('-').map(Number)
  return Math.round((Date.UTC(ty, tm - 1, td) - Date.UTC(fy, fm - 1, fd)) / 86400000)
}

// Zeitraum eines Termins in einer Zeile: eintägig "Sa, 19.09.26 17:00–18:00",
// mehrtägig "Sa, 19.09.26 09:00 – So, 20.09.26 17:00".
export function formatEventRange(startDate, startTime, endDate, endTime) {
  const st = startTime.slice(0, 5)
  const et = endTime.slice(0, 5)
  if (startDate === endDate) return `${formatOccurrenceDateShort(startDate)} ${formatTimeRange(st, et)}`
  return `${formatOccurrenceDateShort(startDate)} ${st} – ${formatOccurrenceDateShort(endDate)} ${et}`
}
