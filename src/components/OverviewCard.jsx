export default function OverviewCard({ icon, title, desc, badge, active, onClick }) {
  return (
    <div className={`card${active ? ' active-card' : ''}`} onClick={onClick}>
      {badge && <span className={`badge ${badge}`}>{badge === 'live' ? 'live' : 'bereit'}</span>}
      <div className="icon">{icon}</div>
      <h3>{title}</h3>
      <p>{desc}</p>
    </div>
  )
}
