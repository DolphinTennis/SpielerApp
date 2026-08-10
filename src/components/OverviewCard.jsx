import { useTranslation } from 'react-i18next'

const BADGE_KEYS = { live: 'overview.badgeLive', neu: 'overview.badgeNeu' }

export default function OverviewCard({ icon, title, desc, badge, active, onClick }) {
  const { t } = useTranslation()
  return (
    <div className={`card${active ? ' active-card' : ''}`} onClick={onClick}>
      {badge && <span className={`badge ${badge}`}>{t(BADGE_KEYS[badge] || 'overview.badgeReady')}</span>}
      <div className="icon">{icon}</div>
      <h3>{title}</h3>
      <p>{desc}</p>
    </div>
  )
}
