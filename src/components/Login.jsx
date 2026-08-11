import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const [showForgot, setShowForgot] = useState(false)
  const [forgotEmail, setForgotEmail] = useState('')
  const [forgotSubmitting, setForgotSubmitting] = useState(false)
  const [forgotSent, setForgotSent] = useState(false)
  const [forgotError, setForgotError] = useState('')

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

  async function handleForgotSubmit(e) {
    e.preventDefault()
    setForgotError('')
    setForgotSubmitting(true)
    // Always the real public app URL, never window.location.origin — same
    // reasoning as inviteMember in teamApi.js.
    const appUrl = import.meta.env.VITE_APP_URL || window.location.origin
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
      redirectTo: `${appUrl}/reset-password`,
    })
    setForgotSubmitting(false)
    if (resetError) {
      setForgotError(resetError.message)
      return
    }
    // Supabase returns success regardless of whether the address is
    // registered — deliberately not revealing which is intentional
    // security behavior, not something to work around here.
    setForgotSent(true)
  }

  return (
    <div style={styles.page}>
      <div style={styles.hero}>
        <div style={styles.heroInner}>
          <div style={styles.brandMark}>
            Dolphin<span style={{ color: 'var(--ball)' }}>.</span>
          </div>
          <div style={styles.brandSub}>DEIN SPIELERPORTAL</div>
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

        {!showForgot && (
          <p style={{ fontSize: 13, color: 'var(--text-soft)', marginTop: 8, textAlign: 'center' }}>
            <button
              type="button"
              onClick={() => {
                setShowForgot(true)
                setForgotEmail(email)
              }}
              style={styles.linkButton}
            >
              Passwort vergessen?
            </button>
          </p>
        )}

        {showForgot && !forgotSent && (
          <div style={{ marginTop: 18, paddingTop: 18, borderTop: '1px solid var(--line)' }}>
            <p style={{ fontSize: 13, color: 'var(--text-soft)', margin: '0 0 12px' }}>
              Trag deine E-Mail-Adresse ein, wir schicken dir einen Link zum Vergeben eines neuen Passworts.
            </p>
            <div className="field" style={{ marginBottom: 12 }}>
              <label htmlFor="forgot-email">E-Mail</label>
              <input
                id="forgot-email"
                type="email"
                required
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                placeholder="name@example.com"
              />
            </div>
            {forgotError && <div style={styles.error}>{forgotError}</div>}
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }} onClick={handleForgotSubmit} disabled={forgotSubmitting}>
                {forgotSubmitting ? 'Sendet …' : 'Link senden'}
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => setShowForgot(false)}>
                Abbrechen
              </button>
            </div>
          </div>
        )}

        {forgotSent && (
          <div style={{ marginTop: 18, paddingTop: 18, borderTop: '1px solid var(--line)', fontSize: 13, color: 'var(--text-soft)', textAlign: 'center' }}>
            Falls „{forgotEmail}" bei uns registriert ist, wurde gerade ein Link zum Zurücksetzen verschickt.
          </div>
        )}
      </form>
    </div>
  )
}

const styles = {
  linkButton: {
    background: 'none',
    border: 'none',
    padding: 0,
    font: 'inherit',
    color: 'var(--court)',
    cursor: 'pointer',
    textDecoration: 'underline',
  },
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
