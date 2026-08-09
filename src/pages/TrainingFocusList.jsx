import { useEffect, useState } from 'react'
import TrainingFocusRow from '../components/TrainingFocusRow'
import { deleteEntry, listEntries } from '../lib/trainingFocusApi'
import { useToast } from '../lib/ToastContext'
import { useOrg } from '../lib/OrgContext'

export default function TrainingFocusList({ onOpenEntry, onNewEntry }) {
  const { orgId, playerName } = useOrg()
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const toast = useToast()

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    listEntries(orgId)
      .then((data) => {
        if (!cancelled) setEntries(data)
      })
      .catch((err) => {
        console.error(err)
        toast('Trainingsfokus-Einträge konnten nicht geladen werden.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [orgId, toast])

  async function handleDelete(entry) {
    const label = entry.datum ? entry.datum : 'ohne Datum'
    if (!window.confirm('Eintrag „' + label + '" wirklich löschen? Das kann nicht rückgängig gemacht werden.')) return
    try {
      await deleteEntry(entry.id)
      setEntries((prev) => prev.filter((e) => e.id !== entry.id))
      toast('Eintrag gelöscht.')
    } catch (err) {
      console.error(err)
      toast('Löschen fehlgeschlagen.')
    }
  }

  return (
    <div className="view">
      <h1 className="section-title">Trainingsfokus</h1>
      <p className="section-sub">Vorbereitung und Nacharbeit zum Training für {playerName}.</p>

      <div className="list-head">
        <span style={{ fontSize: 13, color: 'var(--text-soft)', fontWeight: 600 }}>
          {loading ? 'Lädt …' : `${entries.length} ${entries.length === 1 ? 'Eintrag' : 'Einträge'}`}
        </span>
        <button className="btn btn-primary" onClick={onNewEntry}>
          + Neuer Eintrag
        </button>
      </div>

      {!loading && entries.length === 0 && (
        <div className="empty-state">
          <div className="big-emoji">🎯</div>
          <p>
            <strong>Noch keine Einträge.</strong>
          </p>
          <p>Erfasse deinen ersten Trainingsfokus über „Neuer Eintrag".</p>
        </div>
      )}

      <div className="match-list">
        {entries.map((e) => (
          <TrainingFocusRow key={e.id} entry={e} onClick={() => onOpenEntry(e.id)} onDelete={() => handleDelete(e)} />
        ))}
      </div>
    </div>
  )
}
