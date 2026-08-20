import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
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
import { downloadIcs } from '../lib/icalExport'
import { ensureFeedToken, renewFeedToken, feedUrl, webcalUrl, sendCalendarLinkToTeam } from '../lib/calendarFeedApi'
import { CATEGORY_BY_KEY, UPCOMING_COUNT_OPTIONS } from '../config/trainingPlanCategories'
import { listGoals, deleteGoal } from '../lib/trainingGoalsApi'
import TrainingSessionEditor from '../components/TrainingSessionEditor'
import TrainingGoalsPanel from '../components/TrainingGoalsPanel'

function renderEventContent(arg) {
  const { location, note, category } = arg.event.extendedProps
  const textColor = CATEGORY_BY_KEY[category]?.textColor || '#fff'
  return (
    <div className="trainingplan-event-content" style={{ color: textColor }}>
      <div className="trainingplan-event-title">
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
  const { t, i18n } = useTranslation()
  const { session } = useAuth()
  const { orgId, permissions } = useOrg()
  const toast = useToast()
  const canConfirm = !!permissions?.confirm_termine
  const canCreate = canConfirm || !!permissions?.calendar_entries
  const canSubscribe = !!permissions?.calendar_subscribe

  const [feedToken, setFeedToken] = useState(null)
  const [feedBusy, setFeedBusy] = useState(false)

  const [sessions, setSessions] = useState([])
  const [exceptions, setExceptions] = useState([])
  const [goals, setGoals] = useState([])
  const [loading, setLoading] = useState(true)
  const [visibleRange, setVisibleRange] = useState(null)
  const [editingTarget, setEditingTarget] = useState(null)
  const [upcomingCount, setUpcomingCount] = useState(UPCOMING_COUNT_OPTIONS[0])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    Promise.all([listTrainingSessions(orgId), listTrainingSessionExceptions(orgId), listGoals(orgId)])
      .then(([s, e, g]) => {
        if (!cancelled) {
          setSessions(s)
          setExceptions(e)
          setGoals(g)
        }
      })
      .catch((err) => {
        console.error(err)
        toast(t('trainingsplan.loadFailed'))
      })
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId])

  async function handleCompleteGoal(goal) {
    setGoals((prev) => prev.filter((g) => g.id !== goal.id))
    try {
      await deleteGoal(goal.id)
    } catch (err) {
      console.error(err)
      toast(t('trainingsplan.goalCompleteFailed'))
      setGoals((prev) => [...prev, goal])
    }
  }

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
    if (!canCreate) return
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
      toast(t('trainingsplan.eventUpdated'))
    } catch (err) {
      console.error(err)
      toast(t('trainingsplan.moveFailed'))
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
        toast(t('trainingsplan.eventCreated'))
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
        toast(t('trainingsplan.saved'))
      }
      setEditingTarget(null)
    } catch (err) {
      console.error(err)
      toast(t('trainingsplan.saveFailed'))
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
      toast(t('trainingsplan.confirmed'))
      setEditingTarget(null)
    } catch (err) {
      console.error(err)
      toast(t('trainingsplan.confirmFailed'))
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
      toast(t('trainingsplan.cancelled'))
      setEditingTarget(null)
    } catch (err) {
      console.error(err)
      toast(t('trainingsplan.cancelFailed'))
    }
  }

  async function handleEditorDeleteSeries() {
    try {
      const id = editingTarget.session.id
      await deleteTrainingSession(id)
      setSessions((prev) => prev.filter((s) => s.id !== id))
      setExceptions((prev) => prev.filter((e) => e.session_id !== id))
      toast(editingTarget.isRecurring ? t('trainingsplan.seriesDeleted') : t('trainingsplan.eventDeleted'))
      setEditingTarget(null)
    } catch (err) {
      console.error(err)
      toast(t('trainingsplan.deleteFailed'))
    }
  }

  // Lädt genau das, was auch das Abonnement liefert, statt die Datei ein
  // zweites Mal im Browser zu bauen — so können Export und Abo nicht
  // auseinanderlaufen.
  async function handleExportIcs() {
    setFeedBusy(true)
    try {
      const token = feedToken || (await ensureFeedToken(session.user.id, orgId))
      if (!feedToken) setFeedToken(token)
      const response = await fetch(feedUrl(token))
      if (!response.ok) throw new Error('HTTP ' + response.status)
      downloadIcs('terminplanung.ics', await response.text())
    } catch (err) {
      console.error(err)
      toast(t('trainingsplan.feedFailed'))
    } finally {
      setFeedBusy(false)
    }
  }

  async function handleCopyLink() {
    try {
      const token = feedToken || (await ensureFeedToken(session.user.id, orgId))
      setFeedToken(token)
      await navigator.clipboard.writeText(feedUrl(token))
      toast(t('trainingsplan.feedCopied'))
    } catch (err) {
      console.error(err)
      toast(t('trainingsplan.feedFailed'))
    }
  }

  // Bewusst mit Rückfrage: bestehende Abonnements hören danach auf zu
  // aktualisieren, und zwar wortlos — die Kalender-App meldet keinen Fehler,
  // die Termine hören einfach auf, sich zu ändern.
  async function handleRenewLink() {
    if (!window.confirm(t('trainingsplan.feedRenewConfirm'))) return
    setFeedBusy(true)
    try {
      const token = await renewFeedToken(session.user.id, orgId)
      setFeedToken(token)
      toast(t('trainingsplan.feedRenewed'))
    } catch (err) {
      console.error(err)
      toast(t('trainingsplan.feedFailed'))
    } finally {
      setFeedBusy(false)
    }
  }

  async function handleSendLinks() {
    if (!window.confirm(t('trainingsplan.feedSendConfirm'))) return
    setFeedBusy(true)
    try {
      const result = await sendCalendarLinkToTeam(orgId)
      toast(t('trainingsplan.feedSent', { anzahl: result.versendet }))
    } catch (err) {
      console.error(err)
      toast(err?.message || t('trainingsplan.feedFailed'))
    } finally {
      setFeedBusy(false)
    }
  }

  return (
    <div className="view">
      <h1 className="section-title">{t('trainingsplan.title')}</h1>
      <p className="section-sub">{t('trainingsplan.subtitle')}</p>

      <div style={{ marginBottom: 16 }}>
        <button type="button" className="btn btn-outline btn-sm" onClick={handleExportIcs} disabled={feedBusy}>
          {t('trainingsplan.exportIcs')}
        </button>
      </div>

      {canSubscribe && (
        <div className="calendar-feed-box">
          <div className="calendar-feed-title">{t('trainingsplan.feedTitle')}</div>
          <p className="calendar-feed-hint">{t('trainingsplan.feedIntro')}</p>
          <div className="calendar-feed-actions">
            <a
              className="btn btn-primary btn-sm"
              href={feedToken ? webcalUrl(feedToken) : undefined}
              onClick={async (e) => {
                if (feedToken) return
                // Der Link entsteht erst beim ersten Bedarf — sonst legt jeder
                // Seitenaufruf ein Token an, das nie jemand benutzt.
                e.preventDefault()
                try {
                  const token = await ensureFeedToken(session.user.id, orgId)
                  setFeedToken(token)
                  window.location.href = webcalUrl(token)
                } catch (err) {
                  console.error(err)
                  toast(t('trainingsplan.feedFailed'))
                }
              }}
            >
              {t('trainingsplan.feedSubscribe')}
            </a>
            <button type="button" className="btn btn-outline btn-sm" onClick={handleCopyLink} disabled={feedBusy}>
              {t('trainingsplan.feedCopy')}
            </button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={handleRenewLink} disabled={feedBusy}>
              {t('trainingsplan.feedRenew')}
            </button>
            <button type="button" className="btn btn-clay btn-sm" onClick={handleSendLinks} disabled={feedBusy}>
              {t('trainingsplan.feedSend')}
            </button>
          </div>
          <p className="calendar-feed-note">{t('trainingsplan.feedRefreshNote')}</p>
          <p className="calendar-feed-note">{t('trainingsplan.feedPrivacyNote')}</p>
        </div>
      )}

      <div className="trainingplan-upcoming">
        <div className="trainingplan-upcoming-header">
          <h2>{t('trainingsplan.upcoming')}</h2>
          <div className="trainingplan-count-picker">
            {UPCOMING_COUNT_OPTIONS.map((n) => (
              <button key={n} type="button" className={upcomingCount === n ? 'active' : ''} onClick={() => setUpcomingCount(n)}>
                {n}
              </button>
            ))}
          </div>
        </div>
        {upcomingEvents.length === 0 ? (
          <p className="trainingplan-upcoming-empty">{loading ? t('common.loading') : t('trainingsplan.empty')}</p>
        ) : (
          <ul className="trainingplan-upcoming-list">
            {upcomingEvents.map((ev) => (
              <li key={ev.id} className={ev.extendedProps.status === 'proposed' ? 'proposed' : ''}>
                <span className="trainingplan-upcoming-date">{formatOccurrenceDateShort(ev.extendedProps.occurrenceDate)}</span>
                <span className="trainingplan-upcoming-time">{formatTimeRange(ev.extendedProps.startTime, ev.extendedProps.endTime)}</span>
                <span className="trainingplan-upcoming-category" style={{ '--cat-color': CATEGORY_BY_KEY[ev.extendedProps.category].color }}>
                  {t(CATEGORY_BY_KEY[ev.extendedProps.category].labelKey)}
                </span>
                {ev.extendedProps.withWhom && <span className="trainingplan-upcoming-detail">{t('trainingsplan.with', { name: ev.extendedProps.withWhom })}</span>}
                {ev.extendedProps.location && <span className="trainingplan-upcoming-detail">{ev.extendedProps.location}</span>}
                {ev.extendedProps.note && <span className="trainingplan-upcoming-note">{ev.extendedProps.note}</span>}
                {ev.extendedProps.status === 'proposed' && <span className="trainingplan-upcoming-flag">{t('trainingsplan.proposed')}</span>}
              </li>
            ))}
          </ul>
        )}
      </div>

      <TrainingGoalsPanel goals={goals} onComplete={handleCompleteGoal} />

      <div className="trainingplan-calendar">
        <FullCalendar
          plugins={[multiMonthPlugin, dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView="timeGridWeek"
          headerToolbar={{ left: 'prev,next today', center: 'title', right: 'multiMonthYear,dayGridMonth,timeGridWeek,timeGridDay' }}
          locale={i18n.language === 'en' ? undefined : deLocale}
          firstDay={1}
          slotMinTime="07:00:00"
          slotMaxTime="21:00:00"
          height="auto"
          selectable={canCreate}
          selectMirror
          editable
          eventResizableFromStart
          eventDisplay="block"
          dayMaxEvents={0}
          views={{ dayGridMonth: { dayMaxEvents: false } }}
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
          canConfirm={canConfirm}
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
