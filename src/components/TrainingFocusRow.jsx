import { useTranslation } from 'react-i18next'
import { formatDate } from '../lib/format'

export default function TrainingFocusRow({ entry, onClick, onDelete }) {
  const { t } = useTranslation()
  return (
    <div className="match-row" onClick={onClick}>
      <div className="score-chip">📅 {formatDate(entry.datum)}</div>
      <div className="match-meta">
        <div className="opp">{entry.trainingsziel || t('trainingsfokus.noGoalNoted')}</div>
      </div>
      {entry.filed && <span className="filed-tag">{t('trainingsfokus.filed')}</span>}
      <button
        type="button"
        className="row-delete"
        title={t('trainingsfokus.deleteTitle')}
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
