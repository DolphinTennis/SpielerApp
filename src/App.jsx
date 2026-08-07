import { isSupabaseConfigured } from './lib/supabaseClient'
import { AuthProvider, useAuth } from './lib/AuthContext'
import ConfigWarning from './components/ConfigWarning'
import Login from './components/Login'

function AuthedPlaceholder() {
  const { session, signOut } = useAuth()
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 14 }}>
      <h2 style={{ color: 'var(--ink)' }}>Eingeloggt als {session.user.email}</h2>
      <p style={{ color: 'var(--text-soft)' }}>Die Übersichtsseite folgt im nächsten Schritt.</p>
      <button className="btn btn-outline" onClick={signOut}>Abmelden</button>
    </div>
  )
}

function AppInner() {
  const { session, loading } = useAuth()

  if (loading) return null
  if (!session) return <Login />
  return <AuthedPlaceholder />
}

export default function App() {
  if (!isSupabaseConfigured) return <ConfigWarning />

  return (
    <AuthProvider>
      <AppInner />
    </AuthProvider>
  )
}
