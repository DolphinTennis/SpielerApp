import { useState } from 'react'
import { isSupabaseConfigured } from './lib/supabaseClient'
import { AuthProvider, useAuth } from './lib/AuthContext'
import { ToastProvider } from './lib/ToastContext'
import ConfigWarning from './components/ConfigWarning'
import Login from './components/Login'
import TopBar from './components/TopBar'
import Overview from './pages/Overview'
import Placeholder from './pages/Placeholder'
import MatchList from './pages/MatchList'
import MatchEditor from './pages/MatchEditor'

const PLAYER = 'Naila Wieland'

function AppShell() {
  const [view, setView] = useState('overview')
  const [editorMatchId, setEditorMatchId] = useState(null)

  function goOverview() {
    setView('overview')
  }
  function goMatchList() {
    setView('matchanalyse-list')
  }
  function openMatch(id) {
    setEditorMatchId(id)
    setView('matchanalyse-editor')
  }
  function newMatch() {
    setEditorMatchId(null)
    setView('matchanalyse-editor')
  }

  let crumbs = []
  if (view === 'matchanalyse-list') {
    crumbs = [{ label: '← Übersicht', onClick: goOverview }]
  } else if (view === 'matchanalyse-editor') {
    crumbs = [
      { label: '← Übersicht', onClick: goOverview },
      { label: '← Matchanalyse', onClick: goMatchList },
    ]
  } else if (view !== 'overview') {
    crumbs = [{ label: '← Übersicht', onClick: goOverview }]
  }

  return (
    <div id="app-shell">
      <TopBar playerName={PLAYER} crumbs={crumbs} />
      {view === 'overview' && (
        <Overview onNavigate={(key) => (key === 'matchanalyse' ? goMatchList() : setView(key))} />
      )}
      {view === 'matchanalyse-list' && <MatchList onOpenMatch={openMatch} onNewMatch={newMatch} />}
      {view === 'matchanalyse-editor' && <MatchEditor matchId={editorMatchId} onBack={goMatchList} />}
      {view !== 'overview' && view !== 'matchanalyse-list' && view !== 'matchanalyse-editor' && (
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
