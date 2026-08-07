import OverviewCard from '../components/OverviewCard'
import { OVERVIEW_ITEMS } from '../config/overviewItems'

export default function Overview({ onNavigate }) {
  return (
    <div className="view">
      <h1 className="section-title">Übersicht</h1>
      <p className="section-sub">Aktuelle Themen rund um Nailas Saison.</p>
      <div className="grid">
        {OVERVIEW_ITEMS.map((item) => (
          <OverviewCard
            key={item.key}
            icon={item.icon}
            title={item.title}
            desc={item.desc}
            badge={item.implemented ? item.badge : null}
            active={item.implemented}
            onClick={() => onNavigate(item.key)}
          />
        ))}
      </div>
    </div>
  )
}
