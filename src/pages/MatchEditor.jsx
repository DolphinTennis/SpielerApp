import { useEffect, useState } from 'react'
import FormCard from '../components/FormCard'
import { FORM1_CARDS, FORM2_FIELDS } from '../config/matchFormFields'
import { blankMatch, createMatch, getMatch, updateMatch } from '../lib/matchesApi'
import { buildMailBody, printInPage } from '../lib/matchExport'
import { formatDate } from '../lib/format'
import { useToast } from '../lib/ToastContext'
import { useAuth } from '../lib/AuthContext'
import { useOrg } from '../lib/OrgContext'

export default function MatchEditor({ matchId, onBack }) {
  const { session } = useAuth()
  const { orgId, playerName } = useOrg()
  const toast = useToast()
  const [record, setRecord] = useState(null)
  const [tab, setTab] = useState(1)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let cancelled = false
    if (matchId) {
      getMatch(matchId)
        .then((rec) => {
          if (!cancelled) setRecord(rec)
        })
        .catch((err) => {
          console.error(err)
          toast('Match konnte nicht geladen werden.')
        })
    } else {
      setRecord(blankMatch(session.user.id, orgId, playerName))
    }
    setTab(1)
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchId, orgId, playerName])

  function updateField(key, value) {
    setRecord((r) => ({ ...r, [key]: value }))
  }
  function updateForm1(key, value) {
    setRecord((r) => ({ ...r, form1: { ...r.form1, [key]: value } }))
  }
  function updateForm2(key, value) {
    setRecord((r) => ({ ...r, form2: { ...r.form2, [key]: value } }))
  }

  async function persist(rec, silent, msg) {
    setSaving(true)
    try {
      let saved
      if (rec.id) {
        const { id, created_at, updated_at, ...patch } = rec
        saved = await updateMatch(id, patch)
      } else {
        saved = await createMatch(rec)
      }
      setRecord(saved)
      if (msg) toast(msg)
      else if (!silent) toast('Matchanalyse gespeichert.')
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

  async function handlePrint(formNumber) {
    try {
      const saved = await persist(record, true)
      printInPage(saved, formNumber)
      toast('Druckdialog wird geöffnet — dort „Als PDF speichern" wählen.')
    } catch (err) {
      if (err?.message) toast(err.message)
    }
  }

  async function handleMail() {
    try {
      const saved = await persist(record, true)
      const subject = encodeURIComponent('Matchanalyse ' + saved.spieler + ' - ' + (saved.gegner || '') + ' (' + formatDate(saved.datum) + ')')
      window.location.href = 'mailto:?subject=' + subject + '&body=' + buildMailBody(saved)
      toast('E-Mail-Programm wird geöffnet. Tipp: Für den PDF-Anhang zuerst „Als PDF drucken" nutzen und die Datei anhängen.')
    } catch {
      /* toasted in persist */
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

  async function handleNewForm() {
    try {
      await persist(record, true)
      setRecord(blankMatch(session.user.id, orgId, playerName))
      setTab(1)
      toast('Neues Formular angelegt.')
    } catch {
      /* toasted in persist */
    }
  }

  if (!record) return null

  return (
    <div className="view">
      <h1 className="section-title">Matchanalyse</h1>
      <p className="section-sub">{playerName}</p>

      <div className="editor-header">
        <div className="field">
          <label htmlFor="e-verlauf">Spielverlauf</label>
          <textarea
            id="e-verlauf"
            placeholder="Kurzer Überblick über den Spielverlauf …"
            style={{ minHeight: 52 }}
            value={record.verlauf || ''}
            onChange={(e) => updateField('verlauf', e.target.value)}
          />
        </div>
        <div className="grid-fields">
          <div className="field">
            <label htmlFor="e-date">Spieldatum</label>
            <input id="e-date" type="date" value={record.datum || ''} onChange={(e) => updateField('datum', e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="e-opp">Name Gegnerin</label>
            <input id="e-opp" type="text" placeholder="Gegnerin" value={record.gegner || ''} onChange={(e) => updateField('gegner', e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="e-result">Spielergebnis</label>
            <input
              id="e-result"
              type="text"
              placeholder="z. B. 6:4, 3:6, 6:2"
              value={record.ergebnis || ''}
              onChange={(e) => updateField('ergebnis', e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="e-tourn">Turnier</label>
            <input id="e-tourn" type="text" placeholder="Turniername" value={record.turnier || ''} onChange={(e) => updateField('turnier', e.target.value)} />
          </div>
        </div>
      </div>

      <div className="tabs">
        <div className={`tab${tab === 1 ? ' active' : ''}`} onClick={() => setTab(1)}>
          Formular 1 · Spielreflexion
        </div>
        <div className={`tab${tab === 2 ? ' active' : ''}`} onClick={() => setTab(2)}>
          Formular 2 · Triple-A-Analyse
        </div>
      </div>

      <div className={`form-panel${tab === 1 ? ' active' : ''}`}>
        {FORM1_CARDS.map((card) => (
          <FormCard key={card.title} card={card} values={record.form1} onChange={updateForm1} />
        ))}
      </div>

      <div className={`form-panel${tab === 2 ? ' active' : ''}`}>
        <div className="form-card">
          <h4>Triple-A-Analyse</h4>
          <p className="hint">Nach der Triple-A-Methode von Stefanie Sziburies.</p>
          <div className="aaa-note">
            Am besten frühestens einen Tag nach dem Match ausfüllen — mit etwas Abstand fällt die ehrliche, sachliche Einordnung leichter.
          </div>
          <div className="two-col">
            <div className="qgroup">
              <label className="qlabel">{FORM2_FIELDS.gut}</label>
              <textarea style={{ minHeight: 110 }} value={record.form2.gut} onChange={(e) => updateForm2('gut', e.target.value)} />
            </div>
            <div className="qgroup">
              <label className="qlabel">{FORM2_FIELDS.nicht}</label>
              <textarea style={{ minHeight: 110 }} value={record.form2.nicht} onChange={(e) => updateForm2('nicht', e.target.value)} />
            </div>
          </div>
          <div className="qgroup">
            <label className="qlabel">{FORM2_FIELDS.warum}</label>
            <textarea value={record.form2.warum} onChange={(e) => updateForm2('warum', e.target.value)} />
          </div>
          <div className="qgroup">
            <label className="qlabel">{FORM2_FIELDS.ziel}</label>
            <textarea value={record.form2.ziel} onChange={(e) => updateForm2('ziel', e.target.value)} />
          </div>
          <div className="attrib">© Stefanie Sziburies — Triple-A-Analyse</div>
        </div>
      </div>

      <div className="action-bar">
        <div className="left-actions">
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            💾 Speichern
          </button>
          <button className="btn btn-outline" onClick={() => handlePrint(1)} disabled={saving}>
            🖨️ Formular 1 als PDF
          </button>
          <button className="btn btn-outline" onClick={() => handlePrint(2)} disabled={saving}>
            🖨️ Formular 2 als PDF
          </button>
          <button className="btn btn-outline" onClick={handleMail} disabled={saving}>
            ✉️ Per E-Mail senden
          </button>
        </div>
        <div className="right-actions">
          <button className="btn btn-ghost" onClick={handleFile} disabled={saving}>
            🗂️ Ablegen
          </button>
          <button className="btn btn-clay" onClick={handleNewForm} disabled={saving}>
            ➕ Neues Formular
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
