import { useState } from 'react'
import { CATEGORIES } from '../config/yearPlanCategories'
import { formatDate } from '../lib/format'

export default function YearPlanDayPopover({ date, entry, isSpieler, onClose, onSave, onConfirm, onDelete }) {
  const [category, setCategory] = useState(entry.category)
  const [note, setNote] = useState(entry.note || '')
  const [busy, setBusy] = useState(false)

  async function run(fn) {
    setBusy(true)
    try {
      await fn()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="yearplan-popover-backdrop" onClick={onClose}>
      <div className="yearplan-popover" onClick={(e) => e.stopPropagation()}>
        <h3>{formatDate(date)}</h3>
        {entry.status === 'proposed' && <span className="proposed-badge">Vorschlag von {entry.created_by_label || 'Teammitglied'}</span>}

        <div className="field" style={{ marginBottom: 12 }}>
          <label htmlFor="yp-category">Kategorie</label>
          <select id="yp-category" value={category} onChange={(e) => setCategory(e.target.value)}>
            {CATEGORIES.map((c) => (
              <option key={c.key} value={c.key}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="yp-note">Notiz (optional)</label>
          <textarea
            id="yp-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="z. B. Turnier Möhlin"
            style={{ minHeight: 60 }}
          />
        </div>

        <div className="yearplan-popover-actions">
          {isSpieler && entry.status === 'proposed' && (
            <button type="button" className="btn btn-primary" disabled={busy} onClick={() => run(onConfirm)}>
              ✓ Bestätigen
            </button>
          )}
          <button type="button" className="btn btn-outline" disabled={busy} onClick={() => run(() => onSave(category, note))}>
            Speichern
          </button>
          <button type="button" className="btn btn-clay" disabled={busy} onClick={() => run(onDelete)}>
            {isSpieler && entry.status === 'proposed' ? 'Ablehnen' : 'Löschen'}
          </button>
          <button type="button" className="btn btn-ghost" disabled={busy} onClick={onClose}>
            Abbrechen
          </button>
        </div>
      </div>
    </div>
  )
}
