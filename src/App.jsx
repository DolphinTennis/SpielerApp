import { useState } from 'react'
import { isSupabaseConfigured } from './lib/supabaseClient'
import { AuthProvider, useAuth } from './lib/AuthContext'
import { ToastProvider } from './lib/ToastContext'
import ConfigWarning from './components/ConfigWarning'
import Login from './components/Login'
import TopBar from './components/TopBar'
import Overview from './pages/Overview'
import Placeholder from './pages/Placeholder'

const PLAYER = 'Naila Wieland'

function AppShell() {
  const [view, setView] = useState('overview')

  const crumbs =
    view === 'overview'
      ? []
      : [{ label: '← Übersicht', onClick: () => setView('overview') }]

  return (
    <div id="app-shell">
      <TopBar playerName={PLAYER} crumbs={crumbs} />
      {view === 'overview' ? (
        <Overview onNavigate={setView} />
      ) : (
        <Placeholder viewKey={view} />
      )}
    </div>
  )
}

function AppInner() {
  const { session, loading } = useAuth()

  if (loading) return null
  if (!session) return <Login />
  return (
    <ToastProvider>
      <AppShell />
    </ToastProvider>
  )
}

export default function App() {
  if (!isSupabaseConfigured) return <ConfigWarning />

  return (
    <AuthProvider>
      <AppInner />
    </AuthProvider>
  )
}
