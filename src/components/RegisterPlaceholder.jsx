import { Link } from 'react-router-dom'

export default function RegisterPlaceholder() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div
        style={{
          maxWidth: 420,
          background: 'var(--paper)',
          border: '1px solid var(--line)',
          borderRadius: 'var(--radius)',
          boxShadow: 'var(--shadow)',
          padding: 24,
          textAlign: 'center',
        }}
      >
        <h2 style={{ color: 'var(--ink)', fontSize: 22, marginBottom: 10 }}>Registrierung folgt bald</h2>
        <p style={{ color: 'var(--text-soft)', fontSize: 14, lineHeight: 1.5, marginBottom: 18 }}>
          Die Selbstregistrierung für neue Teams ist noch im Aufbau.
        </p>
        <Link to="/login" className="btn btn-primary" style={{ textDecoration: 'none', display: 'inline-flex' }}>
          Zum Login
        </Link>
      </div>
    </div>
  )
}
