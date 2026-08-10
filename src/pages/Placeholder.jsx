import { useTranslation } from 'react-i18next'
import { OVERVIEW_ITEMS } from '../config/overviewItems'

export default function Placeholder({ viewKey }) {
  const { t } = useTranslation()
  const item = OVERVIEW_ITEMS.find((i) => i.key === viewKey)
  const title = item ? t(item.titleKey) : viewKey === 'mein-dolphin' ? t('placeholder.meinDolphin') : t('placeholder.fallbackTitle')
  return (
    <div className="view">
      <h1 className="section-title">{title}</h1>
      <div className="placeholder-view">
        <div className="big-emoji">🚧</div>
        <p>
          <strong>{t('placeholder.underConstruction')}</strong>
        </p>
        <p>{t('placeholder.underConstructionDesc')}</p>
      </div>
    </div>
  )
}
