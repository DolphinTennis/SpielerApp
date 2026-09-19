import test from 'node:test'
import assert from 'node:assert/strict'
import { expandRawOccurrences, addDaysIso } from '../supabase/functions/_shared/occurrenceRules.ts'

const base = { category: 'tennis', start_time: '17:00:00', end_time: '18:00:00', span_days: 0, status: 'confirmed' }
// 2026-09-15 ist ein Dienstag
const series = { ...base, id: 's1', weekdays: [2], start_date: '2026-09-01', end_date: null }
const oneOff = (id, date, extra = {}) => ({ ...base, id, weekdays: [], start_date: date, end_date: null, ...extra })
const starts = (list) => list.map((o) => `${o.startDate}>${o.endDate}`)

test('Einmaltermin ohne Dauer erscheint nur in seinem Bereich', () => {
  const s = [oneOff('a', '2026-09-15')]
  assert.equal(expandRawOccurrences(s, [], '2026-09-14', '2026-09-20').length, 1)
  assert.equal(expandRawOccurrences(s, [], '2026-09-16', '2026-09-20').length, 0)
})

test('Mehrtägiges Turnier: Ende = Beginn + Dauer', () => {
  const s = [oneOff('t', '2026-09-12', { span_days: 1, end_time: '17:00:00', start_time: '09:00:00' })]
  const [o] = expandRawOccurrences(s, [], '2026-09-01', '2026-09-30')
  assert.equal(o.startDate, '2026-09-12')
  assert.equal(o.endDate, '2026-09-13')
  assert.equal(o.endTime, '17:00:00')
})

test('Mehrtägiger Termin, der VOR dem Bereich beginnt, erscheint trotzdem', () => {
  const s = [oneOff('t', '2026-09-30', { span_days: 3 })] // 30.09. bis 03.10.
  assert.equal(expandRawOccurrences(s, [], '2026-10-01', '2026-10-31').length, 1)
  assert.equal(expandRawOccurrences(s, [], '2026-10-04', '2026-10-31').length, 0)
})

test('Endzeit darf früher sein als Startzeit, wenn der Termin über Nacht geht', () => {
  const s = [oneOff('n', '2026-09-12', { span_days: 1, start_time: '20:00:00', end_time: '10:00:00' })]
  const [o] = expandRawOccurrences(s, [], '2026-09-12', '2026-09-12')
  assert.equal(o.endDate, '2026-09-13')
})

test('Mehrtägige Serie reicht über die Bereichsgrenze', () => {
  const s = [{ ...series, weekdays: [5], span_days: 2 }] // jeden Freitag bis Sonntag
  // Bereich beginnt am Samstag 12.09. – der Freitag 11.09. reicht hinein
  const r = expandRawOccurrences(s, [], '2026-09-12', '2026-09-13')
  assert.deepEqual(starts(r), ['2026-09-11>2026-09-13'])
})

test('Einzelne Verschiebung ändert nur diesen Termin, nicht die Serie', () => {
  const ex = [{ session_id: 's1', occurrence_date: '2026-09-15', override_date: '2026-09-16', cancelled: false, status: 'confirmed' }]
  const r = expandRawOccurrences([series], ex, '2026-09-14', '2026-09-28')
  assert.deepEqual(starts(r), ['2026-09-16>2026-09-16', '2026-09-22>2026-09-22'])
})

test('Termin von NÄCHSTER Woche auf diese Woche vorgezogen wird in dieser Woche angezeigt', () => {
  const ex = [{ session_id: 's1', occurrence_date: '2026-09-22', override_date: '2026-09-18', cancelled: false, status: 'confirmed' }]
  const r = expandRawOccurrences([series], ex, '2026-09-14', '2026-09-20')
  assert.deepEqual(starts(r), ['2026-09-15>2026-09-15', '2026-09-18>2026-09-18'])
})

test('Abgesagter Termin fehlt, verschobener Termin aus dem Bereich heraus fehlt', () => {
  const cancel = [{ session_id: 's1', occurrence_date: '2026-09-15', cancelled: true }]
  assert.deepEqual(starts(expandRawOccurrences([series], cancel, '2026-09-14', '2026-09-20')), [])
  const away = [{ session_id: 's1', occurrence_date: '2026-09-15', override_date: '2026-09-25', cancelled: false }]
  assert.deepEqual(starts(expandRawOccurrences([series], away, '2026-09-14', '2026-09-20')), [])
})

test('Einzeln geänderte Dauer wirkt nur auf diesen Termin', () => {
  const ex = [{ session_id: 's1', occurrence_date: '2026-09-15', override_span_days: 2, cancelled: false }]
  const r = expandRawOccurrences([series], ex, '2026-09-14', '2026-09-28')
  assert.deepEqual(starts(r), ['2026-09-15>2026-09-17', '2026-09-22>2026-09-22'])
})

test('Serienende wird respektiert', () => {
  const s = [{ ...series, end_date: '2026-09-15' }]
  assert.equal(expandRawOccurrences(s, [], '2026-09-01', '2026-12-31').length, 3) // Dienstage 1., 8. und 15.09.
})

test('addDaysIso rechnet über Monats- und Jahresgrenzen', () => {
  assert.equal(addDaysIso('2026-12-31', 1), '2027-01-01')
  assert.equal(addDaysIso('2026-03-01', -1), '2026-02-28')
})

test('Abo-Feed: mehrtägiges Turnier hat richtigen Start und Ende im iCalendar', async () => {
  const { expandSessions, buildIcs } = await import('../supabase/functions/_shared/calendarFeed.ts')
  const s = [oneOff('t', '2026-09-12', { category: 'turnier_national', span_days: 1, start_time: '09:00:00', end_time: '17:00:00' })]
  const ics = buildIcs(expandSessions(s, [], '2026-09-01', '2026-09-30'), 'Test')
  assert.match(ics, /DTSTART:20260912T090000/)
  assert.match(ics, /DTEND:20260913T170000/)
  assert.match(ics, /SUMMARY:Turnier national/)
})
