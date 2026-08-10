import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CATEGORIES, WEEKDAYS } from '../config/trainingPlanCategories'
import { formatOccurrenceDateLong } from '../lib/trainingPlanOccurrences'

export default function TrainingSessionEditor({
  mode,
  initial,
  occurrenceDate,
  status,
  isRecurring,
  canConfirm,
  onClose,
  onSave,
  onConfirm,
  onCancelOccurrence,
  onDeleteSeries,
}) {
  const { t } = useTranslation()
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
  const [busy, setBusy] = useState(false)

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

  function handleSave() {
    if (!oneOff && weekdays.length === 0) return
    run(() =>
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
      })
    )
  }

  const heading = mode === 'create' ? t('trainingSessionEditor.headingCreate') : isRecurring ? t('trainingSessionEditor.headingEditSeries') : t('trainingSessionEditor.headingEdit')

  return (
    <div className="trainingplan-popover-backdrop" onClick={onClose}>
      <div className="trainingplan-popover" onClick={(e) => e.stopPropagation()}>
        <h3>{heading}</h3>
        {isRecurring && occurrenceDate && (
          <p className="trainingplan-popover-subtitle">{t('trainingSessionEditor.unit', { date: formatOccurrenceDateLong(occurrenceDate) })}</p>
        )}
        {status === 'proposed' && <span className="proposed-badge">{t('trainingSessionEditor.proposedBadge')}</span>}

        <div className="field" style={{ marginBottom: 12 }}>
          <label htmlFor="ts-category">{t('trainingSessionEditor.topic')}</label>
          <select id="ts-category" value={category} onChange={(e) => setCategory(e.target.value)}>
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

        <label className="trainingplan-oneoff-toggle">
          <input type="checkbox" checked={oneOff} onChange={(e) => setOneOff(e.target.checked)} />
          <span>
            <span>{t('trainingSessionEditor.oneOff')}</span>
            <span className="trainingplan-oneoff-hint">{t('trainingSessionEditor.oneOffHint')}</span>
          </span>
        </label>

        {oneOff ? (
          <div className="field" style={{ marginBottom: 12 }}>
            <label htmlFor="ts-date">{t('trainingSessionEditor.date')}</label>
            <input id="ts-date" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
          </div>
        ) : (
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
                <label htmlFor="ts-end-date">{t('trainingSessionEditor.until')}</label>
                <input id="ts-end-date" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </div>
            </div>
          </>
        )}

        <div className="field">
          <label htmlFor="ts-note">{t('trainingSessionEditor.note')}</label>
          <textarea
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
          <button type="button" className="btn btn-outline" disabled={busy} onClick={handleSave}>
            {t('trainingSessionEditor.save')}
          </button>
          {mode === 'edit' && isRecurring && (
            <button type="button" className="btn btn-clay" disabled={busy} onClick={() => run(onCancelOccurrence)}>
              {t('trainingSessionEditor.cancelOccurrence')}
            </button>
          )}
          {mode === 'edit' && (
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
