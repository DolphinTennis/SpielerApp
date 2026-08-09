import { useEffect, useState } from 'react'
import OverviewCard from '../components/OverviewCard'
import { OVERVIEW_ITEMS } from '../config/overviewItems'
import { useOrg } from '../lib/OrgContext'
import { checkMailbox, listMediaExamples } from '../lib/mediaExamplesApi'

function beispieleLastSeenKey(orgId) {
  return `beispiele-last-seen-${orgId}`
}

export default function Overview({ onNavigate }) {
  const { playerName, isAdmin, orgId } = useOrg()
  const [hasNewBeispiele, setHasNewBeispiele] = useState(false)
  const items = OVERVIEW_ITEMS.filter((item) => !item.adminOnly || isAdmin)

  // Checking the shared mailbox here (rather than only on the Beispiele
  // page) means it happens whenever someone logs in or comes back to the
  // dashboard, without needing a background schedule.
  useEffect(() => {
    if (!orgId) return
    let cancelled = false
    checkMailbox()
      .catch((err) => console.error(err))
      .finally(() => {
        if (cancelled) return
        listMediaExamples(orgId)
          .then((data) => {
            if (cancelled || data.length === 0) return
            const latest = data[0].created_at
            const lastSeen = localStorage.getItem(beispieleLastSeenKey(orgId))
            if (!lastSeen || latest > lastSeen) setHasNewBeispiele(true)
          })
          .catch((err) => console.error(err))
      })
    return () => {
      cancelled = true
    }
  }, [orgId])

  return (
    <div className="view">
      <h1 className="section-title">Übersicht</h1>
      <p className="section-sub">Aktuelle Themen rund um {playerName ? playerName + 's' : 'die'} Saison.</p>
      <div className="grid">
        {items.map((item) => {
          const badge = item.key === 'videos' && hasNewBeispiele ? 'neu' : item.implemented ? item.badge : null
          return (
            <OverviewCard
              key={item.key}
              icon={item.icon}
              title={item.title}
              desc={item.desc}
              badge={badge}
              active={item.implemented}
              onClick={() => onNavigate(item.key)}
            />
          )
        })}
      </div>
    </div>
  )
}
