import { useTranslation } from 'react-i18next'

// Beim Klick auf einen Termin einer Serie: nur diesen einen oder die ganze
// Serie bearbeiten?
export default function SeriesChoiceDialog({ dateLabel, weekdaysLabel, onOccurrence, onFollowing, onSeries, onClose }) {
  const { t } = useTranslation()
  return (
    <div className="trainingplan-popover-backdrop" onClick={onClose}>
      <div className="trainingplan-popover trainingplan-choice" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <h3>{t('seriesChoice.title')}</h3>
        <p className="trainingplan-popover-note">{t('seriesChoice.text')}</p>
        <div className="trainingplan-choice-buttons">
          <button type="button" className="btn btn-primary" onClick={onOccurrence}>
            <span>{t('seriesChoice.occurrence')}</span>
            <small>{dateLabel}</small>
          </button>
          <button type="button" className="btn btn-outline" onClick={onFollowing}>
            <span>{t('seriesChoice.following')}</span>
            <small>{t('seriesChoice.followingHint')}</small>
          </button>
          <button type="button" className="btn btn-outline" onClick={onSeries}>
            <span>{t('seriesChoice.series')}</span>
            <small>{weekdaysLabel}</small>
          </button>
        </div>
        <div className="trainingplan-popover-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            {t('seriesChoice.cancel')}
          </button>
        </div>
      </div>
    </div>
  )
}
