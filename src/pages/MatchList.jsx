import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import MatchRow from '../components/MatchRow'
import { deleteMatch, listMatches } from '../lib/matchesApi'
import { useToast } from '../lib/ToastContext'
import { useOrg } from '../lib/OrgContext'

export default function MatchList({ onOpenMatch, onNewMatch }) {
  const { t } = useTranslation()
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
        toast(t('matchanalyse.list.loadFailed'))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    const label = 'vs. ' + (match.gegner || t('matchanalyse.list.unknown')) + (match.datum ? ' (' + match.datum + ')' : '')
    if (!window.confirm(t('matchanalyse.list.deleteConfirm', { label }))) return
    try {
      await deleteMatch(match.id)
      setMatches((prev) => prev.filter((m) => m.id !== match.id))
      toast(t('matchanalyse.list.deleted'))
    } catch (err) {
      console.error(err)
      toast(t('matchanalyse.list.deleteFailed'))
    }
  }

  return (
    <div className="view">
      <h1 className="section-title">{t('matchanalyse.list.title')}</h1>
      <p className="section-sub">{t('matchanalyse.list.subtitle', { name: playerName })}</p>

      <div className="filter-bar">
        <div className="field">
          <label htmlFor="f-opp">{t('matchanalyse.list.opponentName')}</label>
          <input
            id="f-opp"
            type="text"
            placeholder={t('matchanalyse.list.opponentPlaceholder')}
            value={filters.opp}
            onChange={(e) => setFilters((f) => ({ ...f, opp: e.target.value }))}
          />
        </div>
        <div className="field">
          <label htmlFor="f-date">{t('matchanalyse.list.matchDate')}</label>
          <input
            id="f-date"
            type="date"
            value={filters.date}
            onChange={(e) => setFilters((f) => ({ ...f, date: e.target.value }))}
          />
        </div>
        <div className="field">
          <label htmlFor="f-tourn">{t('matchanalyse.list.tournament')}</label>
          <input
            id="f-tourn"
            type="text"
            placeholder={t('matchanalyse.list.tournamentPlaceholder')}
            value={filters.tourn}
            onChange={(e) => setFilters((f) => ({ ...f, tourn: e.target.value }))}
          />
        </div>
        <button className="btn btn-ghost" onClick={() => setFilters({ opp: '', date: '', tourn: '' })}>
          {t('matchanalyse.list.clearFilters')}
        </button>
      </div>

      <div className="list-head">
        <span style={{ fontSize: 13, color: 'var(--text-soft)', fontWeight: 600 }}>
          {loading ? t('common.loading') : `${filtered.length} ${filtered.length === 1 ? t('matchanalyse.list.countGame') : t('matchanalyse.list.countGames')}`}
        </span>
        <button className="btn btn-primary" onClick={onNewMatch}>
          {t('matchanalyse.list.newMatch')}
        </button>
      </div>

      {!loading && filtered.length === 0 && (
        <div className="empty-state">
          <div className="big-emoji">🎾</div>
          <p>
            <strong>{t('matchanalyse.list.emptyTitle')}</strong>
          </p>
          <p>{t('matchanalyse.list.emptyDesc')}</p>
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
