const BADGE_LABELS = { live: 'live', neu: 'neu' }

export default function OverviewCard({ icon, title, desc, badge, active, onClick }) {
  return (
    <div className={`card${active ? ' active-card' : ''}`} onClick={onClick}>
      {badge && <span className={`badge ${badge}`}>{BADGE_LABELS[badge] || 'bereit'}</span>}
      <div className="icon">{icon}</div>
      <h3>{title}</h3>
      <p>{desc}</p>
    </div>
  )
}
