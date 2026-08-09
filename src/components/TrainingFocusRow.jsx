import { formatDate } from '../lib/format'

export default function TrainingFocusRow({ entry, onClick, onDelete }) {
  return (
    <div className="match-row" onClick={onClick}>
      <div className="score-chip">📅 {formatDate(entry.datum)}</div>
      <div className="match-meta">
        <div className="opp">{entry.trainingsziel || 'Kein Trainingsziel notiert'}</div>
      </div>
      {entry.filed && <span className="filed-tag">Abgelegt</span>}
      <button
        type="button"
        className="row-delete"
        title="Eintrag löschen"
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
