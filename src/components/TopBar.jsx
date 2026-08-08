import { useAuth } from '../lib/AuthContext'

function initialsFromEmail(email) {
  if (!email) return '?'
  const name = email.split('@')[0]
  return name.slice(0, 2).toUpperCase()
}

export default function TopBar({ playerName, crumbs = [] }) {
  const { session, signOut } = useAuth()

  return (
    <div className="topbar">
      <div className="topbar-inner">
        <div className="brand">
          <div className="brand-logo">
            <img src="/logo.png" alt="Dolphin Tennis Logo" />
          </div>
          <div className="brand-mark">
            Dolphin<span className="dot">.</span>
          </div>
        </div>
        <div className="player-chip">
          <span className="avatar">{initialsFromEmail(session?.user?.email)}</span>
          {playerName}
          <button type="button" onClick={signOut}>
            Abmelden
          </button>
        </div>
      </div>
      <div className="brand-sub">DEIN SPIELERPORTAL</div>
      <div className="breadcrumb">
        {crumbs.map((crumb, i) => (
          <button key={i} type="button" onClick={crumb.onClick}>
            {crumb.label}
          </button>
        ))}
      </div>
    </div>
  )
}
