import { useTranslation } from 'react-i18next'
import { PLATFORM_ICON } from '../config/mediaExamplePlatforms'
import { formatDate } from '../lib/format'

export default function MediaExampleCard({ item, onDelete }) {
  const { t } = useTranslation()
  return (
    <div className="media-example-card" onClick={() => window.open(item.url, '_blank', 'noopener,noreferrer')}>
      <button
        type="button"
        className="media-example-delete"
        title={t('beispiele.delete')}
        onClick={(e) => {
          e.stopPropagation()
          onDelete(item)
        }}
      >
        ×
      </button>
      <div className="media-example-thumb">
        {item.thumbnail_url ? (
          <img src={item.thumbnail_url} alt="" loading="lazy" />
        ) : (
          <span className="media-example-thumb-icon">{PLATFORM_ICON[item.platform] || '🔗'}</span>
        )}
      </div>
      <div className="media-example-title">{item.title || item.url}</div>
      {item.note && <div className="media-example-note">{item.note}</div>}
      <div className="media-example-meta">
        {t('beispiele.addedBy', {
          name: item.created_by_label || t('beispiele.teamMember'),
          date: formatDate(item.created_at?.slice(0, 10)),
        })}
      </div>
    </div>
  )
}
