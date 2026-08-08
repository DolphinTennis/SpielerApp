import { Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom'
import { useOrg } from '../lib/OrgContext'
import { ToastProvider } from '../lib/ToastContext'
import TopBar from './TopBar'
import Overview from '../pages/Overview'
import MatchList from '../pages/MatchList'
import MatchEditor from '../pages/MatchEditor'
import LiveTicker from '../pages/LiveTicker'
import Files from '../pages/Files'
import TeamManage from '../pages/TeamManage'
import Placeholder from '../pages/Placeholder'

const OVERVIEW_ROUTES = { matchanalyse: 'matchanalyse', liveticker: 'liveticker', dateien: 'dateien' }

function MatchEditorRoute() {
  const { matchId } = useParams()
  const navigate = useNavigate()
  return <MatchEditor matchId={matchId === 'neu' ? null : matchId} onBack={() => navigate('/app/matchanalyse')} />
}

function PlaceholderRoute() {
  const { placeholderKey } = useParams()
  return <Placeholder viewKey={placeholderKey} />
}

function AppShellInner() {
  const { playerName } = useOrg()
  const navigate = useNavigate()
  const location = useLocation()

  let crumbs = []
  if (location.pathname !== '/app') {
    crumbs = [{ label: '← Übersicht', onClick: () => navigate('/app') }]
    if (location.pathname.startsWith('/app/matchanalyse/')) {
      crumbs.push({ label: '← Matchanalyse', onClick: () => navigate('/app/matchanalyse') })
    }
  }

  function handleOverviewNavigate(key) {
    navigate(OVERVIEW_ROUTES[key] ? `/app/${OVERVIEW_ROUTES[key]}` : `/app/${key}`)
  }

  return (
    <div id="app-shell">
      <TopBar playerName={playerName} crumbs={crumbs} />
      <Routes>
        <Route index element={<Overview onNavigate={handleOverviewNavigate} />} />
        <Route
          path="matchanalyse"
          element={
            <MatchList
              onOpenMatch={(id) => navigate(`/app/matchanalyse/${id}`)}
              onNewMatch={() => navigate('/app/matchanalyse/neu')}
            />
          }
        />
        <Route path="matchanalyse/:matchId" element={<MatchEditorRoute />} />
        <Route path="liveticker" element={<LiveTicker onMatchCreated={(id) => navigate(`/app/matchanalyse/${id}`)} />} />
        <Route path="dateien" element={<Files />} />
        <Route path="team" element={<TeamManage />} />
        <Route path=":placeholderKey" element={<PlaceholderRoute />} />
      </Routes>
    </div>
  )
}

export default function AppShell() {
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
      <AppShellInner />
    </ToastProvider>
  )
}
