import { useState } from 'react'
import { CATEGORIES, WEEKDAYS } from '../config/trainingPlanCategories'
import { formatOccurrenceDateLong } from '../lib/trainingPlanOccurrences'

export default function TrainingSessionEditor({
  mode,
  initial,
  occurrenceDate,
  status,
  isRecurring,
  isAdmin,
  onClose,
  onSave,
  onConfirm,
  onCancelOccurrence,
  onDeleteSeries,
}) {
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

  const heading = mode === 'create' ? 'Neuer Termin' : isRecurring ? 'Serie bearbeiten' : 'Termin bearbeiten'

  return (
    <div className="trainingplan-popover-backdrop" onClick={onClose}>
      <div className="trainingplan-popover" onClick={(e) => e.stopPropagation()}>
        <h3>{heading}</h3>
        {isRecurring && occurrenceDate && (
          <p className="trainingplan-popover-subtitle">Einheit: {formatOccurrenceDateLong(occurrenceDate)}</p>
        )}
        {status === 'proposed' && <span className="proposed-badge">Vorschlag — noch nicht bestätigt</span>}

        <div className="field" style={{ marginBottom: 12 }}>
          <label htmlFor="ts-category">Thema</label>
          <select id="ts-category" value={category} onChange={(e) => setCategory(e.target.value)}>
            {CATEGORIES.map((c) => (
              <option key={c.key} value={c.key}>
                {c.label}
              </option>
            ))}
          </select>
        </div>

        <div className="trainingplan-field-row">
          <div className="field">
            <label htmlFor="ts-location">Ort</label>
            <input id="ts-location" type="text" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="z. B. Tennishalle" />
          </div>
          <div className="field">
            <label htmlFor="ts-with-whom">Mit wem</label>
            <input id="ts-with-whom" type="text" value={withWhom} onChange={(e) => setWithWhom(e.target.value)} placeholder="z. B. Trainer Michael" />
          </div>
        </div>

        <div className="trainingplan-field-row">
          <div className="field">
            <label htmlFor="ts-start-time">Startzeit</label>
            <input id="ts-start-time" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} required />
          </div>
          <div className="field">
            <label htmlFor="ts-end-time">Endzeit</label>
            <input id="ts-end-time" type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} required />
          </div>
        </div>

        <label className="trainingplan-oneoff-toggle">
          <input type="checkbox" checked={oneOff} onChange={(e) => setOneOff(e.target.checked)} />
          Einmaliger Termin
        </label>

        {oneOff ? (
          <div className="field" style={{ marginBottom: 12 }}>
            <label htmlFor="ts-date">Datum</label>
            <input id="ts-date" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
          </div>
        ) : (
          <>
            <div className="field" style={{ marginBottom: 8 }}>
              <label>Wochentage</label>
              <div className="trainingplan-weekday-picker">
                {WEEKDAYS.map((w) => (
                  <button
                    key={w.value}
                    type="button"
                    className={weekdays.includes(w.value) ? 'active' : ''}
                    onClick={() => toggleWeekday(w.value)}
                  >
                    {w.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="trainingplan-field-row">
              <div className="field">
                <label htmlFor="ts-start-date">Start ab</label>
                <input id="ts-start-date" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
              </div>
              <div className="field">
                <label htmlFor="ts-end-date">Bis (optional)</label>
                <input id="ts-end-date" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </div>
            </div>
          </>
        )}

        <div className="field">
          <label htmlFor="ts-note">Notiz (optional)</label>
          <textarea id="ts-note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="z. B. Aufschlagtraining" style={{ minHeight: 60 }} />
        </div>

        <div className="trainingplan-popover-actions">
          {isAdmin && status === 'proposed' && (
            <button type="button" className="btn btn-primary" disabled={busy} onClick={() => run(onConfirm)}>
              ✓ Bestätigen
            </button>
          )}
          <button type="button" className="btn btn-outline" disabled={busy} onClick={handleSave}>
            Speichern
          </button>
          {mode === 'edit' && isRecurring && (
            <button type="button" className="btn btn-clay" disabled={busy} onClick={() => run(onCancelOccurrence)}>
              Nur diesen Termin absagen
            </button>
          )}
          {mode === 'edit' && (
            <button type="button" className="btn btn-clay" disabled={busy} onClick={() => run(onDeleteSeries)}>
              {isRecurring ? 'Ganze Serie löschen' : 'Löschen'}
            </button>
          )}
          <button type="button" className="btn btn-ghost" disabled={busy} onClick={onClose}>
            Abbrechen
          </button>
        </div>
      </div>
    </div>
  )
}
