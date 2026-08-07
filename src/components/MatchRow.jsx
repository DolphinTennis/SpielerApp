import { formatDate } from '../lib/format'

export default function MatchRow({ match, onClick }) {
  return (
    <div className="match-row" onClick={onClick}>
      <div className="score-chip">{match.ergebnis || '–'}</div>
      <div className="match-meta">
        <div className="opp">vs. {match.gegner || 'Unbekannt'}</div>
        <div className="sub">
          <span>📅 {formatDate(match.datum)}</span>
          <span>🏆 {match.turnier || '–'}</span>
        </div>
      </div>
      {match.filed && <span className="filed-tag">Abgelegt</span>}
    </div>
  )
}
