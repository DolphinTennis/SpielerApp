import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CATEGORIES } from '../config/yearPlanCategories'
import { formatDate } from '../lib/format'

export default function YearPlanDayPopover({ date, entry, activeCategory, canConfirm, onClose, onSave, onConfirm, onDelete }) {
  const { t } = useTranslation()
  const hasEntry = !!entry
  const [category, setCategory] = useState(entry?.category || activeCategory)
  const [note, setNote] = useState(entry?.note || '')
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
        {entry?.status === 'proposed' && (
          <span className="proposed-badge">
            {t('yearPlanPopover.proposedBy', { name: entry.created_by_label || t('yearPlanPopover.teamMember') })}
          </span>
        )}

        <div className="field" style={{ marginBottom: 12 }}>
          <label htmlFor="yp-category">{t('yearPlanPopover.category')}</label>
          <select id="yp-category" value={category} onChange={(e) => setCategory(e.target.value)}>
            {CATEGORIES.map((c) => (
              <option key={c.key} value={c.key}>
                {t(c.labelKey)}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="yp-note">{t('yearPlanPopover.note')}</label>
          <textarea
            id="yp-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={t('yearPlanPopover.notePlaceholder')}
            style={{ minHeight: 60 }}
          />
        </div>

        <div className="yearplan-popover-actions">
          {canConfirm && entry?.status === 'proposed' && (
            <button type="button" className="btn btn-primary" disabled={busy} onClick={() => run(onConfirm)}>
              {t('yearPlanPopover.confirm')}
            </button>
          )}
          <button type="button" className="btn btn-outline" disabled={busy} onClick={() => run(() => onSave(category, note))}>
            {t('yearPlanPopover.save')}
          </button>
          {hasEntry && (
            <button type="button" className="btn btn-clay" disabled={busy} onClick={() => run(onDelete)}>
              {canConfirm && entry.status === 'proposed' ? t('yearPlanPopover.reject') : t('yearPlanPopover.delete')}
            </button>
          )}
          <button type="button" className="btn btn-ghost" disabled={busy} onClick={onClose}>
            {t('yearPlanPopover.cancel')}
          </button>
        </div>
      </div>
    </div>
  )
}
