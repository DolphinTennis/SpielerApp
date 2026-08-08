import { useState } from 'react'
import { isSupabaseConfigured } from './lib/supabaseClient'
import { AuthProvider, useAuth } from './lib/AuthContext'
import { OrgProvider, useOrg } from './lib/OrgContext'
import { ToastProvider } from './lib/ToastContext'
import ConfigWarning from './components/ConfigWarning'
import Login from './components/Login'
import TopBar from './components/TopBar'
import Overview from './pages/Overview'
import Placeholder from './pages/Placeholder'
import MatchList from './pages/MatchList'
import MatchEditor from './pages/MatchEditor'
import LiveTicker from './pages/LiveTicker'
import Files from './pages/Files'

function AppShell() {
  const { playerName } = useOrg()
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
  function goLiveTicker() {
    setView('liveticker')
  }
  function goFiles() {
    setView('dateien')
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

  function handleOverviewNavigate(key) {
    if (key === 'matchanalyse') goMatchList()
    else if (key === 'liveticker') goLiveTicker()
    else if (key === 'dateien') goFiles()
    else setView(key)
  }

  const KNOWN_VIEWS = ['overview', 'matchanalyse-list', 'matchanalyse-editor', 'liveticker', 'dateien']

  return (
    <div id="app-shell">
      <TopBar playerName={playerName} crumbs={crumbs} />
      {view === 'overview' && <Overview onNavigate={handleOverviewNavigate} />}
      {view === 'matchanalyse-list' && <MatchList onOpenMatch={openMatch} onNewMatch={newMatch} />}
      {view === 'matchanalyse-editor' && <MatchEditor matchId={editorMatchId} onBack={goMatchList} />}
      {view === 'liveticker' && <LiveTicker onMatchCreated={openMatch} />}
      {view === 'dateien' && <Files />}
      {!KNOWN_VIEWS.includes(view) && <Placeholder viewKey={view} />}
    </div>
  )
}

function OrgGate() {
  const { loading, orgId } = useOrg()

  if (loading) return null
  if (!orgId) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <p style={{ color: 'var(--text-soft)', maxWidth: 360, textAlign: 'center' }}>
          Kein Team gefunden. Falls du gerade registriert hast, versuch es in ein paar Sekunden erneut.
        </p>
      </div>
    )
  }
  return (
    <ToastProvider>
      <AppShell />
    </ToastProvider>
  )
}

function AppInner() {
  const { session, loading } = useAuth()

  if (loading) return null
  if (!session) return <Login />
  return (
    <OrgProvider>
      <OrgGate />
    </OrgProvider>
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
