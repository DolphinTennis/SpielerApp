import { useEffect, useMemo, useState } from 'react'
import MatchRow from '../components/MatchRow'
import { deleteMatch, listMatches } from '../lib/matchesApi'
import { useToast } from '../lib/ToastContext'
import { useOrg } from '../lib/OrgContext'

export default function MatchList({ onOpenMatch, onNewMatch }) {
  const { orgId, playerName } = useOrg()
  const [matches, setMatches] = useState([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({ opp: '', date: '', tourn: '' })
  const toast = useToast()

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    listMatches(orgId)
      .then((data) => {
        if (!cancelled) setMatches(data)
      })
      .catch((err) => {
        console.error(err)
        toast('Matchanalysen konnten nicht geladen werden.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [orgId, toast])

  const filtered = useMemo(() => {
    return matches
      .filter((m) => {
        if (filters.opp && !(m.gegner || '').toLowerCase().includes(filters.opp.toLowerCase())) return false
        if (filters.date && m.datum !== filters.date) return false
        if (filters.tourn && !(m.turnier || '').toLowerCase().includes(filters.tourn.toLowerCase())) return false
        return true
      })
      .sort((a, b) => (b.datum || '').localeCompare(a.datum || ''))
  }, [matches, filters])

  async function handleDelete(match) {
    const label = 'vs. ' + (match.gegner || 'Unbekannt') + (match.datum ? ' (' + match.datum + ')' : '')
    if (!window.confirm('Matchanalyse „' + label + '" wirklich löschen? Das kann nicht rückgängig gemacht werden.')) return
    try {
      await deleteMatch(match.id)
      setMatches((prev) => prev.filter((m) => m.id !== match.id))
      toast('Matchanalyse gelöscht.')
    } catch (err) {
      console.error(err)
      toast('Löschen fehlgeschlagen.')
    }
  }

  return (
    <div className="view">
      <h1 className="section-title">Matchanalyse</h1>
      <p className="section-sub">Alle erfassten Spiele von {playerName} — durchsuchen, filtern, auswerten.</p>

      <div className="filter-bar">
        <div className="field">
          <label htmlFor="f-opp">Name Gegnerin</label>
          <input
            id="f-opp"
            type="text"
            placeholder="z. B. Meier"
            value={filters.opp}
            onChange={(e) => setFilters((f) => ({ ...f, opp: e.target.value }))}
          />
        </div>
        <div className="field">
          <label htmlFor="f-date">Spieldatum</label>
          <input
            id="f-date"
            type="date"
            value={filters.date}
            onChange={(e) => setFilters((f) => ({ ...f, date: e.target.value }))}
          />
        </div>
        <div className="field">
          <label htmlFor="f-tourn">Turnier</label>
          <input
            id="f-tourn"
            type="text"
            placeholder="z. B. Bezirksmeisterschaft"
            value={filters.tourn}
            onChange={(e) => setFilters((f) => ({ ...f, tourn: e.target.value }))}
          />
        </div>
        <button className="btn btn-ghost" onClick={() => setFilters({ opp: '', date: '', tourn: '' })}>
          Filter löschen
        </button>
      </div>

      <div className="list-head">
        <span style={{ fontSize: 13, color: 'var(--text-soft)', fontWeight: 600 }}>
          {loading ? 'Lädt …' : `${filtered.length} ${filtered.length === 1 ? 'Spiel' : 'Spiele'}`}
        </span>
        <button className="btn btn-primary" onClick={onNewMatch}>
          + Neue Matchanalyse
        </button>
      </div>

      {!loading && filtered.length === 0 && (
        <div className="empty-state">
          <div className="big-emoji">🎾</div>
          <p>
            <strong>Noch keine Matchanalysen gefunden.</strong>
          </p>
          <p>Erfasse dein erstes Spiel über „Neue Matchanalyse".</p>
        </div>
      )}

      <div className="match-list">
        {filtered.map((m) => (
          <MatchRow key={m.id} match={m} onClick={() => onOpenMatch(m.id)} onDelete={() => handleDelete(m)} />
        ))}
      </div>
    </div>
  )
}
