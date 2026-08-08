import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'

export default function Register() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [teamName, setTeamName] = useState('')
  const [playerName, setPlayerName] = useState('')
  const [role, setRole] = useState('spieler')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [confirmationSent, setConfirmationSent] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        // Stashed on the auth user until first login (no session exists yet
        // while email confirmation is pending, so we can't write to
        // organizations/memberships now — OrgContext creates the team from
        // this metadata once the user actually has a session).
        data: {
          pending_team_name: teamName,
          pending_player_name: playerName,
          pending_role: role,
        },
      },
    })
    setSubmitting(false)
    if (signUpError) {
      setError(signUpError.message === 'User already registered' ? 'Für diese E-Mail existiert bereits ein Konto.' : signUpError.message)
      return
    }
    setConfirmationSent(true)
  }

  if (confirmationSent) {
    return (
      <div style={styles.page}>
        <div style={styles.card}>
          <h2 style={styles.title}>Fast geschafft</h2>
          <p style={{ color: 'var(--text-soft)', fontSize: 14, lineHeight: 1.5 }}>
            Wir haben dir eine Bestätigungs-E-Mail an <strong>{email}</strong> geschickt. Klick auf den Link darin, danach
            kannst du dich anmelden.
          </p>
          <Link to="/login" className="btn btn-primary" style={{ textDecoration: 'none', display: 'inline-flex', marginTop: 14 }}>
            Zum Login
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div style={styles.page}>
      <div style={styles.hero}>
        <div style={styles.heroInner}>
          <div style={styles.brandMark}>
            Tennis<span style={{ color: 'var(--ball)' }}>.</span>
          </div>
          <div style={styles.brandSub}>SPIELERPORTAL &amp; MATCHANALYSE</div>
        </div>
      </div>

      <form style={styles.card} onSubmit={handleSubmit}>
        <h2 style={styles.title}>Team registrieren</h2>
        <p style={styles.subtitle}>Leg dein Team an und lade später Trainer und Management dazu ein.</p>

        <div className="field" style={{ marginBottom: 14 }}>
          <label htmlFor="reg-team">Teamname</label>
          <input id="reg-team" type="text" required placeholder="z. B. TC Möhlin" value={teamName} onChange={(e) => setTeamName(e.target.value)} />
        </div>

        <div className="field" style={{ marginBottom: 14 }}>
          <label htmlFor="reg-player">Name der Spielerin/des Spielers</label>
          <input id="reg-player" type="text" required placeholder="Vor- und Nachname" value={playerName} onChange={(e) => setPlayerName(e.target.value)} />
        </div>

        <div className="field" style={{ marginBottom: 14 }}>
          <label htmlFor="reg-role">Deine Rolle</label>
          <select id="reg-role" value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="spieler">Spieler:in</option>
            <option value="management">Management / Eltern</option>
          </select>
        </div>

        <div className="field" style={{ marginBottom: 14 }}>
          <label htmlFor="reg-email">E-Mail</label>
          <input id="reg-email" type="email" required autoComplete="email" placeholder="name@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>

        <div className="field" style={{ marginBottom: 18 }}>
          <label htmlFor="reg-password">Passwort</label>
          <input
            id="reg-password"
            type="password"
            required
            minLength={6}
            autoComplete="new-password"
            placeholder="mind. 6 Zeichen"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        {error && <div style={styles.error}>{error}</div>}

        <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} disabled={submitting}>
          {submitting ? 'Registriert …' : 'Team registrieren'}
        </button>

        <p style={{ fontSize: 13, color: 'var(--text-soft)', marginTop: 14, textAlign: 'center' }}>
          Schon ein Konto? <Link to="/login">Anmelden</Link>
        </p>
      </form>
    </div>
  )
}

const styles = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 28,
    padding: '20px',
  },
  hero: {
    width: '100%',
    maxWidth: 420,
  },
  heroInner: {
    background: 'linear-gradient(160deg, var(--court) 0%, var(--court-dark) 100%)',
    borderRadius: 20,
    padding: '28px 24px',
    textAlign: 'center',
    color: '#fff',
    boxShadow: 'var(--shadow)',
  },
  brandMark: {
    fontFamily: "'Big Shoulders Display', sans-serif",
    fontWeight: 800,
    fontSize: 40,
    letterSpacing: 0.5,
    lineHeight: 1,
  },
  brandSub: {
    marginTop: 8,
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: 11,
    letterSpacing: 2.5,
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.75)',
  },
  card: {
    width: '100%',
    maxWidth: 420,
    background: 'var(--paper)',
    border: '1px solid var(--line)',
    borderRadius: 'var(--radius)',
    boxShadow: 'var(--shadow)',
    padding: 24,
  },
  title: {
    fontSize: 24,
    color: 'var(--ink)',
  },
  subtitle: {
    margin: '4px 0 20px',
    fontSize: 13,
    color: 'var(--text-soft)',
  },
  error: {
    background: '#FDEDEA',
    color: 'var(--clay)',
    border: '1px solid #F3CFC5',
    borderRadius: 9,
    padding: '9px 12px',
    fontSize: 13,
    marginBottom: 14,
  },
}
