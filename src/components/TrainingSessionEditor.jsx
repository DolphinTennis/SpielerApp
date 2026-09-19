import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CATEGORIES, WEEKDAYS } from '../config/trainingPlanCategories'
import { addDaysIso, daysBetweenIso as daysBetween, formatEventRange, formatOccurrenceDateShort } from '../lib/trainingPlanOccurrences'
import AutoTextarea from "./AutoTextarea"

const MAX_SPAN_DAYS = 30

// scope:
//   'series'     — bearbeitet die Regel selbst (Serie oder Einmaltermin) bzw. legt neu an
//   'occurrence' — bearbeitet genau einen Termin einer Serie (wird als Ausnahme gespeichert)
export default function TrainingSessionEditor({
  mode,
  scope = 'series',
  initial,
  status,
  isRecurring,
  hasException,
  movedFromDate,
  canConfirm,
  onClose,
  onSave,
  onSaveOccurrence,
  onResetOccurrence,
  onConfirm,
  onCancelOccurrence,
  onDeleteSeries,
}) {
  const { t } = useTranslation()
  const isOccurrence = scope === 'occurrence'

  const [category, setCategory] = useState(initial.category)
  const [location, setLocation] = useState(initial.location || '')
  const [withWhom, setWithWhom] = useState(initial.withWhom || '')
  const [note, setNote] = useState(initial.note || '')
  const [startTime, setStartTime] = useState(initial.startTime)
  const [endTime, setEndTime] = useState(initial.endTime)
  const [oneOff, setOneOff] = useState(!initial.weekdays || initial.weekdays.length === 0)
  const [weekdays, setWeekdays] = useState(initial.weekdays || [])
  const [startDate, setStartDate] = useState(initial.startDate)
  const [endDate, setEndDate] = useState(initial.endDate || '')
  // Ende des Termins als Datum — für Einmaltermine und einzelne Termine einer
  // Serie. Bei einer Serie selbst gibt es stattdessen "Dauer in Tagen".
  const [eventEndDate, setEventEndDate] = useState(addDaysIso(initial.startDate, initial.spanDays || 0))
  const [seriesSpan, setSeriesSpan] = useState(initial.spanDays || 0)
  const [busy, setBusy] = useState(false)

  const showEventDates = oneOff || isOccurrence
  const spanDays = showEventDates ? Math.max(0, daysBetween(startDate, eventEndDate)) : seriesSpan
  const endsBeforeStart = spanDays === 0 && endTime <= startTime
  const spanTooLong = spanDays > MAX_SPAN_DAYS
  const invalid = !startDate || !startTime || !endTime || endsBeforeStart || spanTooLong || (!oneOff && !isOccurrence && weekdays.length === 0)

  async function run(fn) {
    setBusy(true)
    try {
      await fn()
    } finally {
      setBusy(false)
    }
  }

  function toggleWeekday(value) {
    setWeekdays((prev) => (prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value].sort()))
  }

  // Verschiebt man den Beginn, wandert das Ende mit — die Dauer bleibt gleich.
  function changeStartDate(next) {
    if (!next) return setStartDate(next)
    const keep = startDate ? Math.max(0, daysBetween(startDate, eventEndDate)) : 0
    setStartDate(next)
    setEventEndDate(addDaysIso(next, keep))
  }

  function handleSave() {
    if (invalid) return
    if (isOccurrence) {
      return run(() => onSaveOccurrence({ location, withWhom, note, startTime, endTime, startDate, spanDays }))
    }
    return run(() =>
      onSave({
        category,
        location,
        withWhom,
        note,
        startTime,
        endTime,
        weekdays: oneOff ? [] : weekdays,
        startDate,
        endDate: oneOff ? null : endDate || null,
        spanDays,
      })
    )
  }

  const heading =
    mode === 'create'
      ? t('trainingSessionEditor.headingCreate')
      : isOccurrence
        ? t('trainingSessionEditor.headingEditOccurrence')
        : isRecurring
          ? t('trainingSessionEditor.headingEditSeries')
          : t('trainingSessionEditor.headingEdit')

  // Voller Zeitraum in einer Zeile, damit man nie raten muss, an welchem Tag
  // (oder über welche Tage) ein Termin liegt.
  let rangeText = ''
  if (startDate && showEventDates) {
    rangeText = formatEventRange(startDate, startTime, eventEndDate, endTime)
  } else if (startDate) {
    rangeText = t('trainingSessionEditor.seriesFrom', { date: formatOccurrenceDateShort(startDate) })
    if (seriesSpan > 0) rangeText += ' · ' + t('trainingSessionEditor.seriesSpanSummary', { count: seriesSpan })
  }

  return (
    <div className="trainingplan-popover-backdrop" onClick={onClose}>
      <div className="trainingplan-popover" onClick={(e) => e.stopPropagation()}>
        <h3>{heading}</h3>
        {rangeText && <p className="trainingplan-popover-subtitle trainingplan-range-summary">{rangeText}</p>}
        {status === 'proposed' && <span className="proposed-badge">{t('trainingSessionEditor.proposedBadge')}</span>}
        {isOccurrence && hasException && (
          <span className="trainingplan-deviates-badge">
            {movedFromDate
              ? t('trainingSessionEditor.movedFrom', { date: formatOccurrenceDateShort(movedFromDate) })
              : t('trainingSessionEditor.deviatesFromSeries')}
          </span>
        )}
        {isOccurrence && <p className="trainingplan-popover-note">{t('trainingSessionEditor.occurrenceHint')}</p>}
        {!isOccurrence && mode === 'edit' && isRecurring && <p className="trainingplan-popover-note">{t('trainingSessionEditor.seriesHint')}</p>}

        <div className="field" style={{ marginBottom: 12 }}>
          <label htmlFor="ts-category">{t('trainingSessionEditor.topic')}</label>
          <select id="ts-category" value={category} disabled={isOccurrence} onChange={(e) => setCategory(e.target.value)}>
            {CATEGORIES.map((c) => (
              <option key={c.key} value={c.key}>
                {t(c.labelKey)}
              </option>
            ))}
          </select>
        </div>

        <div className="trainingplan-field-row">
          <div className="field">
            <label htmlFor="ts-location">{t('trainingSessionEditor.location')}</label>
            <input
              id="ts-location"
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder={t('trainingSessionEditor.locationPlaceholder')}
            />
          </div>
          <div className="field">
            <label htmlFor="ts-with-whom">{t('trainingSessionEditor.withWhom')}</label>
            <input
              id="ts-with-whom"
              type="text"
              value={withWhom}
              onChange={(e) => setWithWhom(e.target.value)}
              placeholder={t('trainingSessionEditor.withWhomPlaceholder')}
            />
          </div>
        </div>

        {!isOccurrence && (
          <label className="trainingplan-oneoff-toggle">
            <input type="checkbox" checked={oneOff} onChange={(e) => setOneOff(e.target.checked)} />
            <span>
              <span>{t('trainingSessionEditor.oneOff')}</span>
              <span className="trainingplan-oneoff-hint">{t('trainingSessionEditor.oneOffHint')}</span>
            </span>
          </label>
        )}

        {showEventDates ? (
          <>
            <div className="trainingplan-field-row">
              <div className="field">
                <label htmlFor="ts-date">{t('trainingSessionEditor.beginDate')}</label>
                <input id="ts-date" type="date" value={startDate} onChange={(e) => changeStartDate(e.target.value)} required />
              </div>
              <div className="field">
                <label htmlFor="ts-start-time">{t('trainingSessionEditor.beginTime')}</label>
                <input id="ts-start-time" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} required />
              </div>
            </div>
            <div className="trainingplan-field-row">
              <div className="field">
                <label htmlFor="ts-end-date">{t('trainingSessionEditor.endDate')}</label>
                <input id="ts-end-date" type="date" value={eventEndDate} min={startDate} onChange={(e) => setEventEndDate(e.target.value)} required />
              </div>
              <div className="field">
                <label htmlFor="ts-end-time">{t('trainingSessionEditor.endTimeOfDay')}</label>
                <input id="ts-end-time" type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} required />
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="trainingplan-field-row">
              <div className="field">
                <label htmlFor="ts-start-time">{t('trainingSessionEditor.startTime')}</label>
                <input id="ts-start-time" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} required />
              </div>
              <div className="field">
                <label htmlFor="ts-end-time">{t('trainingSessionEditor.endTime')}</label>
                <input id="ts-end-time" type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} required />
              </div>
            </div>
            <div className="field" style={{ marginBottom: 12 }}>
              <label htmlFor="ts-span">{t('trainingSessionEditor.duration')}</label>
              <select id="ts-span" value={seriesSpan} onChange={(e) => setSeriesSpan(Number(e.target.value))}>
                <option value={0}>{t('trainingSessionEditor.sameDay')}</option>
                {Array.from({ length: 13 }, (_, i) => i + 1).map((n) => (
                  <option key={n} value={n}>
                    {t('trainingSessionEditor.daysLater', { count: n })}
                  </option>
                ))}
              </select>
            </div>
          </>
        )}
        {endsBeforeStart && <p className="trainingplan-form-error">{t('trainingSessionEditor.errEndBeforeStart')}</p>}
        {spanTooLong && <p className="trainingplan-form-error">{t('trainingSessionEditor.errTooLong', { count: MAX_SPAN_DAYS })}</p>}

        {!oneOff && !isOccurrence && (
          <>
            <div className="field" style={{ marginBottom: 8 }}>
              <label>{t('trainingSessionEditor.weekdays')}</label>
              <div className="trainingplan-weekday-picker">
                {WEEKDAYS.map((w) => (
                  <button
                    key={w.value}
                    type="button"
                    className={weekdays.includes(w.value) ? 'active' : ''}
                    onClick={() => toggleWeekday(w.value)}
                  >
                    {t(w.labelKey)}
                  </button>
                ))}
              </div>
            </div>
            <div className="trainingplan-field-row">
              <div className="field">
                <label htmlFor="ts-start-date">{t('trainingSessionEditor.startFrom')}</label>
                <input id="ts-start-date" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
              </div>
              <div className="field">
                <label htmlFor="ts-until">{t('trainingSessionEditor.until')}</label>
                <input id="ts-until" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </div>
            </div>
          </>
        )}

        <div className="field">
          <label htmlFor="ts-note">{t('trainingSessionEditor.note')}</label>
          <AutoTextarea
            id="ts-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={t('trainingSessionEditor.notePlaceholder')}
            style={{ minHeight: 60 }}
          />
        </div>

        <div className="trainingplan-popover-actions">
          {canConfirm && status === 'proposed' && (
            <button type="button" className="btn btn-primary" disabled={busy} onClick={() => run(onConfirm)}>
              {t('trainingSessionEditor.confirm')}
            </button>
          )}
          <button type="button" className="btn btn-outline" disabled={busy || invalid} onClick={handleSave}>
            {isOccurrence ? t('trainingSessionEditor.saveOccurrence') : t('trainingSessionEditor.save')}
          </button>
          {isOccurrence && hasException && (
            <button type="button" className="btn btn-ghost" disabled={busy} onClick={() => run(onResetOccurrence)}>
              {t('trainingSessionEditor.resetToSeries')}
            </button>
          )}
          {mode === 'edit' && isOccurrence && (
            <button type="button" className="btn btn-clay" disabled={busy} onClick={() => run(onCancelOccurrence)}>
              {t('trainingSessionEditor.cancelOccurrence')}
            </button>
          )}
          {mode === 'edit' && !isOccurrence && (
            <button type="button" className="btn btn-clay" disabled={busy} onClick={() => run(onDeleteSeries)}>
              {isRecurring ? t('trainingSessionEditor.deleteSeries') : t('trainingSessionEditor.delete')}
            </button>
          )}
          <button type="button" className="btn btn-ghost" disabled={busy} onClick={onClose}>
            {t('trainingSessionEditor.cancel')}
          </button>
        </div>
      </div>
    </div>
  )
}
