import { OVERVIEW_ITEMS } from '../config/overviewItems'

export default function Placeholder({ viewKey }) {
  const item = OVERVIEW_ITEMS.find((i) => i.key === viewKey)
  return (
    <div className="view">
      <h1 className="section-title">{item?.title || 'Bereich'}</h1>
      <div className="placeholder-view">
        <div className="big-emoji">🚧</div>
        <p>
          <strong>Dieser Bereich befindet sich im Aufbau.</strong>
        </p>
        <p>Hier entsteht demnächst echter Inhalt — aktuell ist das ein Platzhalter.</p>
      </div>
    </div>
  )
}
