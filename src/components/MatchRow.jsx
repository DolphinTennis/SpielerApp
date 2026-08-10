import { useTranslation } from 'react-i18next'
import { formatDate } from '../lib/format'

export default function MatchRow({ match, onClick, onDelete }) {
  const { t } = useTranslation()
  return (
    <div className="match-row" onClick={onClick}>
      <div className="score-chip">{match.ergebnis || '–'}</div>
      <div className="match-meta">
        <div className="opp">vs. {match.gegner || t('matchanalyse.list.unknown')}</div>
        <div className="sub">
          <span>📅 {formatDate(match.datum)}</span>
          <span>🏆 {match.turnier || '–'}</span>
        </div>
      </div>
      {match.filed && <span className="filed-tag">{t('matchanalyse.list.filed')}</span>}
      <button
        type="button"
        className="row-delete"
        title={t('matchanalyse.list.deleteTitle')}
        onClick={(e) => {
          e.stopPropagation()
          onDelete()
        }}
      >
        🗑️
      </button>
    </div>
  )
}
