import { useEffect, useState } from 'react'
import { blankEntry, createEntry, getEntry, updateEntry } from '../lib/trainingFocusApi'
import { printInPage } from '../lib/trainingFocusExport'
import { useToast } from '../lib/ToastContext'
import { useAuth } from '../lib/AuthContext'
import { useOrg } from '../lib/OrgContext'

export default function TrainingFocusEditor({ entryId, onBack }) {
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
          toast('Eintrag konnte nicht geladen werden.')
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
      else if (!silent) toast('Trainingsfokus gespeichert.')
      return saved
    } catch (err) {
      console.error(err)
      toast('Speichern fehlgeschlagen.')
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
      toast('Druckdialog wird geöffnet — dort „Als PDF speichern" wählen.')
    } catch (err) {
      if (err?.message) toast(err.message)
    }
  }

  async function handleFile() {
    const updated = { ...record, filed: !record.filed }
    setRecord(updated)
    try {
      await persist(updated, true, updated.filed ? 'Als abgelegt markiert.' : 'Ablage-Markierung entfernt.')
    } catch {
      /* toasted in persist */
    }
  }

  async function handleNewEntry() {
    try {
      await persist(record, true)
      setRecord(blankEntry(session.user.id, orgId, playerName))
      toast('Neuer Eintrag angelegt.')
    } catch {
      /* toasted in persist */
    }
  }

  if (!record) return null

  return (
    <div className="view">
      <h1 className="section-title">Trainingsfokus</h1>
      <p className="section-sub">{playerName}</p>

      <div className="editor-header">
        <div className="grid-fields">
          <div className="field">
            <label htmlFor="tf-date">Datum</label>
            <input id="tf-date" type="date" value={record.datum || ''} onChange={(e) => updateField('datum', e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="tf-energie-mental">Energie mental (1–10)</label>
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
            <label htmlFor="tf-energie-physisch">Energie physisch (1–10)</label>
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
            <label htmlFor="tf-einsatz">Wie viel habe ich gegeben (in %)</label>
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
            <label className="qlabel">Mein Trainingsziel</label>
            <textarea value={record.trainingsziel || ''} onChange={(e) => updateField('trainingsziel', e.target.value)} />
          </div>
          <div className="qgroup">
            <label className="qlabel">Was haben wir geübt</label>
            <textarea value={record.geuebt || ''} onChange={(e) => updateField('geuebt', e.target.value)} />
          </div>
          <div className="qgroup">
            <label className="qlabel">Was war gut</label>
            <textarea value={record.gut || ''} onChange={(e) => updateField('gut', e.target.value)} />
          </div>
          <div className="qgroup">
            <label className="qlabel">Was kann ich verbessern</label>
            <textarea value={record.verbessern || ''} onChange={(e) => updateField('verbessern', e.target.value)} />
          </div>
        </div>
      </div>

      <div className="action-bar">
        <div className="left-actions">
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            💾 Speichern
          </button>
          <button className="btn btn-outline" onClick={handlePrint} disabled={saving}>
            🖨️ Als PDF drucken
          </button>
        </div>
        <div className="right-actions">
          <button className="btn btn-ghost" onClick={handleFile} disabled={saving}>
            🗂️ Ablegen
          </button>
          <button className="btn btn-clay" onClick={handleNewEntry} disabled={saving}>
            ➕ Neuer Eintrag
          </button>
        </div>
      </div>

      <div className="breadcrumb-inline" style={{ marginTop: 14 }}>
        <button type="button" className="btn btn-ghost btn-sm" onClick={onBack}>
          ← Zurück zur Liste
        </button>
      </div>
    </div>
  )
}
