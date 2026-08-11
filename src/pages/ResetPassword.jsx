import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext'
import { supabase } from '../lib/supabaseClient'

export default function ResetPassword() {
  const { session, loading, signOut } = useAuth()
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password })
      if (updateError) throw updateError
      setDone(true)
      // Recovery sessions become regular sessions once used — sign out
      // explicitly so the user starts fresh with their new password
      // instead of silently staying logged in (and, for an admin-only
      // account with no team, landing on AppShell's "Kein Team gefunden").
      await signOut()
      setTimeout(() => navigate('/login', { replace: true }), 1800)
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return null

  if (!session) {
    // Same reasoning as AcceptInvite.jsx — Supabase redirects expired/used
    // recovery links here with the reason in the URL hash.
    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''))
    const isExpired = hashParams.get('error_code') === 'otp_expired'

    return (
      <div style={styles.page}>
        <div style={styles.card}>
          <h2 style={styles.title}>{isExpired ? 'Link abgelaufen' : 'Link ungültig'}</h2>
          <p style={{ color: 'var(--text-soft)', fontSize: 14, lineHeight: 1.5 }}>
            {isExpired
              ? 'Dieser Link zum Zurücksetzen wurde schon verwendet oder ist abgelaufen. Fordere auf der Anmeldeseite über „Passwort vergessen?" einen neuen an.'
              : 'Fordere auf der Anmeldeseite über „Passwort vergessen?" einen neuen Link an.'}
          </p>
        </div>
      </div>
    )
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
        <h2 style={styles.title}>Neues Passwort</h2>
        <p style={styles.subtitle}>Leg ein neues Passwort für deinen Zugang fest.</p>

        {done ? (
          <p style={{ color: 'var(--text-soft)', fontSize: 14 }}>Passwort geändert. Du wirst zur Anmeldung weitergeleitet …</p>
        ) : (
          <>
            <div className="field" style={{ marginBottom: 18 }}>
              <label htmlFor="reset-password">Neues Passwort</label>
              <input
                id="reset-password"
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
              {submitting ? 'Wird gespeichert …' : 'Passwort speichern'}
            </button>
          </>
        )}
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
  hero: { width: '100%', maxWidth: 420 },
  heroInner: {
    background: 'linear-gradient(160deg, var(--court) 0%, var(--court-dark) 100%)',
    borderRadius: 20,
    padding: '28px 24px',
    textAlign: 'center',
    color: '#fff',
    boxShadow: 'var(--shadow)',
  },
  brandMark: { fontFamily: "'Big Shoulders Display', sans-serif", fontWeight: 800, fontSize: 40, letterSpacing: 0.5, lineHeight: 1 },
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
  title: { fontSize: 24, color: 'var(--ink)' },
  subtitle: { margin: '4px 0 20px', fontSize: 13, color: 'var(--text-soft)' },
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
