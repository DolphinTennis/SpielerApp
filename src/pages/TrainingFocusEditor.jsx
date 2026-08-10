import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { blankEntry, createEntry, getEntry, updateEntry } from '../lib/trainingFocusApi'
import { printInPage } from '../lib/trainingFocusExport'
import { useToast } from '../lib/ToastContext'
import { useAuth } from '../lib/AuthContext'
import { useOrg } from '../lib/OrgContext'

export default function TrainingFocusEditor({ entryId, onBack }) {
  const { t } = useTranslation()
  const { session } = useAuth()
  const { orgId, playerName } = useOrg()
  const toast = useToast()
  const [record, setRecord] = useState(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let cancelled = false
    if (entryId) {
      getEntry(entryId)
        .then((rec) => {
          if (!cancelled) setRecord(rec)
        })
        .catch((err) => {
          console.error(err)
          toast(t('trainingsfokus.entryLoadFailed'))
        })
    } else {
      setRecord(blankEntry(session.user.id, orgId, playerName))
    }
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entryId, orgId, playerName])

  function updateField(key, value) {
    setRecord((r) => ({ ...r, [key]: value }))
  }

  async function persist(rec, silent, msg) {
    setSaving(true)
    try {
      let saved
      if (rec.id) {
        const { id, created_at, updated_at, ...patch } = rec
        saved = await updateEntry(id, patch)
      } else {
        saved = await createEntry(rec)
      }
      setRecord(saved)
      if (msg) toast(msg)
      else if (!silent) toast(t('trainingsfokus.saved'))
      return saved
    } catch (err) {
      console.error(err)
      toast(t('trainingsfokus.saveFailed'))
      throw err
    } finally {
      setSaving(false)
    }
  }

  async function handleSave() {
    try {
      await persist(record, false)
    } catch {
      /* toasted in persist */
    }
  }

  async function handlePrint() {
    try {
      const saved = await persist(record, true)
      printInPage(saved)
      toast(t('trainingsfokus.printDialog'))
    } catch (err) {
      if (err?.message) toast(err.message)
    }
  }

  async function handleFile() {
    const updated = { ...record, filed: !record.filed }
    setRecord(updated)
    try {
      await persist(updated, true, updated.filed ? t('trainingsfokus.filedMsg') : t('trainingsfokus.unfiledMsg'))
    } catch {
      /* toasted in persist */
    }
  }

  async function handleNewEntry() {
    try {
      await persist(record, true)
      setRecord(blankEntry(session.user.id, orgId, playerName))
      toast(t('trainingsfokus.newEntryMsg'))
    } catch {
      /* toasted in persist */
    }
  }

  if (!record) return null

  return (
    <div className="view">
      <h1 className="section-title">{t('trainingsfokus.title')}</h1>
      <p className="section-sub">{playerName}</p>

      <div className="editor-header">
        <div className="grid-fields">
          <div className="field">
            <label htmlFor="tf-date">{t('trainingsfokus.date')}</label>
            <input id="tf-date" type="date" value={record.datum || ''} onChange={(e) => updateField('datum', e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="tf-energie-mental">{t('trainingsfokus.energyMental')}</label>
            <input
              id="tf-energie-mental"
              type="number"
              min="1"
              max="10"
              value={record.energie_mental ?? ''}
              onChange={(e) => updateField('energie_mental', e.target.value === '' ? null : Number(e.target.value))}
            />
          </div>
          <div className="field">
            <label htmlFor="tf-energie-physisch">{t('trainingsfokus.energyPhysical')}</label>
            <input
              id="tf-energie-physisch"
              type="number"
              min="1"
              max="10"
              value={record.energie_physisch ?? ''}
              onChange={(e) => updateField('energie_physisch', e.target.value === '' ? null : Number(e.target.value))}
            />
          </div>
          <div className="field">
            <label htmlFor="tf-einsatz">{t('trainingsfokus.effort')}</label>
            <input
              id="tf-einsatz"
              type="number"
              min="0"
              max="100"
              value={record.einsatz_prozent ?? ''}
              onChange={(e) => updateField('einsatz_prozent', e.target.value === '' ? null : Number(e.target.value))}
            />
          </div>
        </div>
      </div>

      <div className="form-panel active">
        <div className="form-card">
          <div className="qgroup">
            <label className="qlabel">{t('trainingsfokus.myGoal')}</label>
            <textarea value={record.trainingsziel || ''} onChange={(e) => updateField('trainingsziel', e.target.value)} />
          </div>
          <div className="qgroup">
            <label className="qlabel">{t('trainingsfokus.whatWePracticed')}</label>
            <textarea value={record.geuebt || ''} onChange={(e) => updateField('geuebt', e.target.value)} />
          </div>
          <div className="qgroup">
            <label className="qlabel">{t('trainingsfokus.whatWasGood')}</label>
            <textarea value={record.gut || ''} onChange={(e) => updateField('gut', e.target.value)} />
          </div>
          <div className="qgroup">
            <label className="qlabel">{t('trainingsfokus.whatToImprove')}</label>
            <textarea value={record.verbessern || ''} onChange={(e) => updateField('verbessern', e.target.value)} />
          </div>
        </div>
      </div>

      <div className="action-bar">
        <div className="left-actions">
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {t('trainingsfokus.save')}
          </button>
          <button className="btn btn-outline" onClick={handlePrint} disabled={saving}>
            {t('trainingsfokus.printPdf')}
          </button>
        </div>
        <div className="right-actions">
          <button className="btn btn-ghost" onClick={handleFile} disabled={saving}>
            {t('trainingsfokus.file')}
          </button>
          <button className="btn btn-clay" onClick={handleNewEntry} disabled={saving}>
            {t('trainingsfokus.newEntryBtn')}
          </button>
        </div>
      </div>

      <div className="breadcrumb-inline" style={{ marginTop: 14 }}>
        <button type="button" className="btn btn-ghost btn-sm" onClick={onBack}>
          {t('trainingsfokus.backToList')}
        </button>
      </div>
    </div>
  )
}
