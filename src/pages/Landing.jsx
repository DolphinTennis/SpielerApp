import { Link } from 'react-router-dom'

const FEATURES = [
  { icon: '🎾', title: 'Matchanalyse', desc: 'Spielreflexion und Triple-A-Analyse nach jedem Match — durchsuchbar und exportierbar.' },
  { icon: '📡', title: 'Liveticker', desc: 'Punktestand live mitverfolgen, inkl. Satz-, Tiebreak- und Match-Tiebreak-Logik.' },
  { icon: '📁', title: 'Meine Dateien', desc: 'Videos, Bilder und Dokumente in Ordnern organisieren — geteilt im ganzen Team.' },
  { icon: '🧑‍🤝‍🧑', title: 'Team & Rollen', desc: 'Spieler:in, Management/Eltern und Trainer — jede:r mit passendem Zugriff.' },
]

export default function Landing() {
  return (
    <div id="app-shell" style={{ paddingBottom: 60 }}>
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
        </div>
        <div className="brand-sub">DEIN SPIELERPORTAL</div>

        <div style={{ marginTop: 28, marginBottom: 8, position: 'relative' }}>
          <h1 style={{ fontSize: 32, color: '#fff', margin: '0 0 10px', maxWidth: 480 }}>
            Die digitale Heimat für dein Tennis-Team
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 15, maxWidth: 440, marginBottom: 22, lineHeight: 1.5 }}>
            Matchanalyse, Liveticker und Dateiablage an einem Ort — für Spieler:in, Trainer und Management gemeinsam.
          </p>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', position: 'relative' }}>
            <Link to="/register" className="btn btn-primary" style={{ textDecoration: 'none' }}>
              Kostenlos registrieren
            </Link>
            <Link
              to="/login"
              className="btn"
              style={{ textDecoration: 'none', background: 'rgba(255,255,255,0.12)', color: '#fff', border: '1px solid rgba(255,255,255,0.3)' }}
            >
              Anmelden
            </Link>
          </div>
        </div>
      </div>

      <h2 className="section-title">Was die App bietet</h2>
      <p className="section-sub">Alles, was ein Team für die Saison braucht.</p>
      <div className="grid">
        {FEATURES.map((f) => (
          <div className="card" key={f.title} style={{ cursor: 'default' }}>
            <div className="icon">{f.icon}</div>
            <h3>{f.title}</h3>
            <p>{f.desc}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
