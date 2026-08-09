import { useEffect, useMemo, useState } from 'react'
import FullCalendar from '@fullcalendar/react'
import multiMonthPlugin from '@fullcalendar/multimonth'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'
import deLocale from '@fullcalendar/core/locales/de'
import { useAuth } from '../lib/AuthContext'
import { useOrg } from '../lib/OrgContext'
import { useToast } from '../lib/ToastContext'
import {
  listTrainingSessions,
  listTrainingSessionExceptions,
  createTrainingSession,
  updateTrainingSession,
  deleteTrainingSession,
  upsertTrainingSessionException,
} from '../lib/trainingPlanApi'
import { expandOccurrences, parseOccurrenceId, formatOccurrenceDateShort, formatTimeRange, todayIso, addDaysIso } from '../lib/trainingPlanOccurrences'
import { CATEGORY_BY_KEY, UPCOMING_COUNT_OPTIONS } from '../config/trainingPlanCategories'
import TrainingSessionEditor from '../components/TrainingSessionEditor'

function renderEventContent(arg) {
  const { location, note } = arg.event.extendedProps
  // timeGrid (week/day) already renders the whole event block in the
  // category color, so the dot is only needed in the list-style dayGrid
  // (month) and multiMonth (year) views, where events are otherwise plain
  // text with no color cue at all.
  const showDot = !arg.view.type.startsWith('timeGrid')
  return (
    <div className="trainingplan-event-content">
      <div className="trainingplan-event-title">
        {showDot && <span className="trainingplan-event-dot" style={{ background: arg.event.backgroundColor }} />}
        {arg.timeText && <span className="trainingplan-event-time">{arg.timeText} </span>}
        {arg.event.title}
      </div>
      {location && <div className="trainingplan-event-detail">{location}</div>}
      {note && <div className="trainingplan-event-detail">{note}</div>}
    </div>
  )
}

function addMinutesToTime(hhmm, minutes) {
  const [h, m] = hhmm.split(':').map(Number)
  const total = h * 60 + m + minutes
  const nh = Math.floor((((total % 1440) + 1440) % 1440) / 60)
  const nm = ((total % 60) + 60) % 60
  return `${String(nh).padStart(2, '0')}:${String(nm).padStart(2, '0')}`
}

export default function Trainingsplan() {
  const { session } = useAuth()
  const { orgId, isAdmin } = useOrg()
  const toast = useToast()

  const [sessions, setSessions] = useState([])
  const [exceptions, setExceptions] = useState([])
  const [loading, setLoading] = useState(true)
  const [visibleRange, setVisibleRange] = useState(null)
  const [editingTarget, setEditingTarget] = useState(null)
  const [upcomingCount, setUpcomingCount] = useState(UPCOMING_COUNT_OPTIONS[0])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    Promise.all([listTrainingSessions(orgId), listTrainingSessionExceptions(orgId)])
      .then(([s, e]) => {
        if (!cancelled) {
          setSessions(s)
          setExceptions(e)
        }
      })
      .catch((err) => {
        console.error(err)
        toast('Trainingsplan konnte nicht geladen werden.')
      })
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId])

  const sessionById = useMemo(() => Object.fromEntries(sessions.map((s) => [s.id, s])), [sessions])
  const exceptionByKey = useMemo(() => {
    const map = {}
    for (const ex of exceptions) map[`${ex.session_id}::${ex.occurrence_date}`] = ex
    return map
  }, [exceptions])

  const calendarEvents = useMemo(
    () => (visibleRange ? expandOccurrences(sessions, exceptions, visibleRange.start, visibleRange.end) : []),
    [sessions, exceptions, visibleRange]
  )

  const upcomingEvents = useMemo(() => {
    const today = todayIso()
    return expandOccurrences(sessions, exceptions, today, addDaysIso(today, 180)).slice(0, upcomingCount)
  }, [sessions, exceptions, upcomingCount])

  function openCreateEditor(dateIso, startTime, endTime) {
    setEditingTarget({
      mode: 'create',
      initial: {
        category: 'tennis',
        location: '',
        withWhom: '',
        note: '',
        startTime: startTime || '17:00',
        endTime: endTime || '18:00',
        weekdays: [],
        startDate: dateIso,
        endDate: null,
      },
    })
  }

  function openEditEditor(fcEvent) {
    const { sessionId, occurrenceDate } = parseOccurrenceId(fcEvent.id)
    const baseSession = sessionById[sessionId]
    if (!baseSession) return
    const exception = exceptionByKey[`${sessionId}::${occurrenceDate}`] || null
    const isRecurring = baseSession.weekdays.length > 0
    setEditingTarget({
      mode: 'edit',
      session: baseSession,
      occurrenceDate,
      exception,
      isRecurring,
      status: exception ? exception.status : baseSession.status,
      initial: {
        category: baseSession.category,
        location: exception?.override_location ?? baseSession.location ?? '',
        withWhom: exception?.override_with_whom ?? baseSession.with_whom ?? '',
        note: exception?.override_note ?? baseSession.note ?? '',
        startTime: (exception?.override_start_time || baseSession.start_time || '').slice(0, 5),
        endTime: (exception?.override_end_time || baseSession.end_time || '').slice(0, 5),
        weekdays: baseSession.weekdays,
        startDate: baseSession.start_date,
        endDate: baseSession.end_date,
      },
    })
  }

  function handleSelect(info) {
    const dateIso = info.startStr.slice(0, 10)
    const hasTime = info.startStr.length > 10
    const startTime = hasTime ? info.startStr.slice(11, 16) : '17:00'
    const endTime = hasTime && info.endStr.length > 10 ? info.endStr.slice(11, 16) : addMinutesToTime(startTime, 60)
    openCreateEditor(dateIso, startTime, endTime)
  }

  function handleEventClick(info) {
    openEditEditor(info.event)
  }

  async function handleEventDropOrResize(info) {
    const { sessionId, occurrenceDate } = parseOccurrenceId(info.event.id)
    const baseSession = sessionById[sessionId]
    if (!baseSession) return
    const newStartIso = info.event.startStr.slice(0, 10)
    const newStartTime = info.event.startStr.slice(11, 16)
    const newEndTime = info.event.endStr.slice(11, 16)
    try {
      if (baseSession.weekdays.length === 0) {
        const updated = await updateTrainingSession(baseSession.id, {
          start_date: newStartIso,
          start_time: newStartTime,
          end_time: newEndTime,
        })
        setSessions((prev) => prev.map((s) => (s.id === updated.id ? updated : s)))
      } else {
        const saved = await upsertTrainingSessionException({
          session_id: sessionId,
          occurrence_date: occurrenceDate,
          override_date: newStartIso !== occurrenceDate ? newStartIso : null,
          override_start_time: newStartTime,
          override_end_time: newEndTime,
        })
        setExceptions((prev) => [...prev.filter((e) => e.id !== saved.id), saved])
      }
      toast('Termin aktualisiert.')
    } catch (err) {
      console.error(err)
      toast('Verschieben fehlgeschlagen.')
      info.revert()
    }
  }

  async function handleEditorSave(values) {
    try {
      if (editingTarget.mode === 'create') {
        const created = await createTrainingSession({
          org_id: orgId,
          category: values.category,
          location: values.location || null,
          with_whom: values.withWhom || null,
          note: values.note || null,
          start_time: values.startTime,
          end_time: values.endTime,
          weekdays: values.weekdays,
          start_date: values.startDate,
          end_date: values.endDate,
          created_by_label: session.user.email,
        })
        setSessions((prev) => [...prev, created])
        toast('Termin angelegt.')
      } else {
        const updated = await updateTrainingSession(editingTarget.session.id, {
          category: values.category,
          location: values.location || null,
          with_whom: values.withWhom || null,
          note: values.note || null,
          start_time: values.startTime,
          end_time: values.endTime,
          weekdays: values.weekdays,
          start_date: values.startDate,
          end_date: values.endDate,
          created_by_label: session.user.email,
        })
        setSessions((prev) => prev.map((s) => (s.id === updated.id ? updated : s)))
        toast('Gespeichert.')
      }
      setEditingTarget(null)
    } catch (err) {
      console.error(err)
      toast('Speichern fehlgeschlagen.')
    }
  }

  async function handleEditorConfirm() {
    try {
      if (editingTarget.exception) {
        const ex = editingTarget.exception
        const saved = await upsertTrainingSessionException({
          session_id: editingTarget.session.id,
          occurrence_date: editingTarget.occurrenceDate,
          override_date: ex.override_date,
          override_start_time: ex.override_start_time,
          override_end_time: ex.override_end_time,
          override_location: ex.override_location,
          override_with_whom: ex.override_with_whom,
          override_note: ex.override_note,
        })
        setExceptions((prev) => [...prev.filter((e) => e.id !== saved.id), saved])
      } else {
        const s = editingTarget.session
        const updated = await updateTrainingSession(s.id, {
          category: s.category,
          location: s.location,
          with_whom: s.with_whom,
          note: s.note,
          start_time: s.start_time,
          end_time: s.end_time,
          weekdays: s.weekdays,
          start_date: s.start_date,
          end_date: s.end_date,
        })
        setSessions((prev) => prev.map((sess) => (sess.id === updated.id ? updated : sess)))
      }
      toast('Bestätigt.')
      setEditingTarget(null)
    } catch (err) {
      console.error(err)
      toast('Bestätigen fehlgeschlagen.')
    }
  }

  async function handleEditorCancelOccurrence() {
    try {
      const saved = await upsertTrainingSessionException({
        session_id: editingTarget.session.id,
        occurrence_date: editingTarget.occurrenceDate,
        cancelled: true,
      })
      setExceptions((prev) => [...prev.filter((e) => e.id !== saved.id), saved])
      toast('Termin abgesagt.')
      setEditingTarget(null)
    } catch (err) {
      console.error(err)
      toast('Absagen fehlgeschlagen.')
    }
  }

  async function handleEditorDeleteSeries() {
    try {
      const id = editingTarget.session.id
      await deleteTrainingSession(id)
      setSessions((prev) => prev.filter((s) => s.id !== id))
      setExceptions((prev) => prev.filter((e) => e.session_id !== id))
      toast(editingTarget.isRecurring ? 'Serie gelöscht.' : 'Termin gelöscht.')
      setEditingTarget(null)
    } catch (err) {
      console.error(err)
      toast('Löschen fehlgeschlagen.')
    }
  }

  return (
    <div className="view">
      <h1 className="section-title">Trainingsplan</h1>
      <p className="section-sub">Trainingszeiten und Entwicklung mit Input von außen.</p>

      <div className="trainingplan-upcoming">
        <div className="trainingplan-upcoming-header">
          <h2>Nächste Termine</h2>
          <div className="trainingplan-count-picker">
            {UPCOMING_COUNT_OPTIONS.map((n) => (
              <button key={n} type="button" className={upcomingCount === n ? 'active' : ''} onClick={() => setUpcomingCount(n)}>
                {n}
              </button>
            ))}
          </div>
        </div>
        {upcomingEvents.length === 0 ? (
          <p className="trainingplan-upcoming-empty">{loading ? 'Lädt…' : 'Noch keine Termine eingetragen.'}</p>
        ) : (
          <ul className="trainingplan-upcoming-list">
            {upcomingEvents.map((ev) => (
              <li key={ev.id} className={ev.extendedProps.status === 'proposed' ? 'proposed' : ''}>
                <span className="trainingplan-upcoming-date">{formatOccurrenceDateShort(ev.extendedProps.occurrenceDate)}</span>
                <span className="trainingplan-upcoming-time">{formatTimeRange(ev.extendedProps.startTime, ev.extendedProps.endTime)}</span>
                <span className="trainingplan-upcoming-category" style={{ '--cat-color': CATEGORY_BY_KEY[ev.extendedProps.category].color }}>
                  {CATEGORY_BY_KEY[ev.extendedProps.category].label}
                </span>
                {ev.extendedProps.withWhom && <span className="trainingplan-upcoming-detail">mit {ev.extendedProps.withWhom}</span>}
                {ev.extendedProps.location && <span className="trainingplan-upcoming-detail">{ev.extendedProps.location}</span>}
                {ev.extendedProps.note && <span className="trainingplan-upcoming-note">{ev.extendedProps.note}</span>}
                {ev.extendedProps.status === 'proposed' && <span className="trainingplan-upcoming-flag">Vorschlag</span>}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="trainingplan-calendar">
        <FullCalendar
          plugins={[multiMonthPlugin, dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView="timeGridWeek"
          headerToolbar={{ left: 'prev,next today', center: 'title', right: 'multiMonthYear,dayGridMonth,timeGridWeek,timeGridDay' }}
          locale={deLocale}
          firstDay={1}
          slotMinTime="07:00:00"
          slotMaxTime="21:00:00"
          height="auto"
          selectable
          selectMirror
          editable
          eventResizableFromStart
          events={calendarEvents}
          eventContent={renderEventContent}
          eventClassNames={(arg) => (arg.event.extendedProps.status === 'proposed' ? ['trainingplan-event--proposed'] : [])}
          datesSet={(info) => setVisibleRange({ start: info.startStr.slice(0, 10), end: info.endStr.slice(0, 10) })}
          select={handleSelect}
          eventClick={handleEventClick}
          eventDrop={handleEventDropOrResize}
          eventResize={handleEventDropOrResize}
        />
      </div>

      {editingTarget && (
        <TrainingSessionEditor
          mode={editingTarget.mode}
          initial={editingTarget.initial}
          occurrenceDate={editingTarget.occurrenceDate}
          status={editingTarget.mode === 'edit' ? editingTarget.status : null}
          isRecurring={editingTarget.mode === 'edit' ? editingTarget.isRecurring : false}
          isAdmin={isAdmin}
          onClose={() => setEditingTarget(null)}
          onSave={handleEditorSave}
          onConfirm={handleEditorConfirm}
          onCancelOccurrence={handleEditorCancelOccurrence}
          onDeleteSeries={handleEditorDeleteSeries}
        />
      )}
    </div>
  )
}
