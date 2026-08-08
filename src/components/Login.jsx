import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    setSubmitting(false)
    if (signInError) {
      setError(
        signInError.message === 'Invalid login credentials'
          ? 'E-Mail oder Passwort ist falsch.'
          : signInError.message
      )
    }
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
        <h2 style={styles.title}>Anmelden</h2>
        <p style={styles.subtitle}>Melde dich mit deinem Team-Konto an</p>

        <div className="field" style={{ marginBottom: 14 }}>
          <label htmlFor="login-email">E-Mail</label>
          <input
            id="login-email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@example.com"
          />
        </div>

        <div className="field" style={{ marginBottom: 18 }}>
          <label htmlFor="login-password">Passwort</label>
          <input
            id="login-password"
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
          />
        </div>

        {error && <div style={styles.error}>{error}</div>}

        <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} disabled={submitting}>
          {submitting ? 'Anmelden …' : 'Anmelden'}
        </button>

        <p style={{ fontSize: 13, color: 'var(--text-soft)', marginTop: 14, textAlign: 'center' }}>
          Noch kein Team? <Link to="/register">Jetzt registrieren</Link>
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
