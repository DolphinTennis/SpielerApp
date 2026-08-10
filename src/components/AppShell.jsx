import { Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useOrg } from '../lib/OrgContext'
import { ToastProvider } from '../lib/ToastContext'
import TopBar from './TopBar'
import Overview from '../pages/Overview'
import MatchList from '../pages/MatchList'
import MatchEditor from '../pages/MatchEditor'
import LiveTicker from '../pages/LiveTicker'
import Files from '../pages/Files'
import TeamManage from '../pages/TeamManage'
import YearPlanning from '../pages/YearPlanning'
import Trainingsplan from '../pages/Trainingsplan'
import Beispiele from '../pages/Beispiele'
import TrainingFocusList from '../pages/TrainingFocusList'
import TrainingFocusEditor from '../pages/TrainingFocusEditor'
import Einstellungen from '../pages/Einstellungen'
import Placeholder from '../pages/Placeholder'

const OVERVIEW_ROUTES = { matchanalyse: 'matchanalyse', liveticker: 'liveticker', dateien: 'dateien' }

function MatchEditorRoute() {
  const { matchId } = useParams()
  const navigate = useNavigate()
  return <MatchEditor matchId={matchId === 'neu' ? null : matchId} onBack={() => navigate('/app/matchanalyse')} />
}

function TrainingFocusEditorRoute() {
  const { entryId } = useParams()
  const navigate = useNavigate()
  return <TrainingFocusEditor entryId={entryId === 'neu' ? null : entryId} onBack={() => navigate('/app/trainingsfokus')} />
}

function PlaceholderRoute() {
  const { placeholderKey } = useParams()
  return <Placeholder viewKey={placeholderKey} />
}

function AppShellInner() {
  const { t } = useTranslation()
  const { playerName } = useOrg()
  const navigate = useNavigate()
  const location = useLocation()

  let crumbs = []
  if (location.pathname !== '/app') {
    crumbs = [{ label: t('appShell.breadcrumbOverview'), onClick: () => navigate('/app') }]
    if (location.pathname.startsWith('/app/matchanalyse/')) {
      crumbs.push({ label: t('appShell.breadcrumbMatchanalyse'), onClick: () => navigate('/app/matchanalyse') })
    }
    if (location.pathname.startsWith('/app/trainingsfokus/')) {
      crumbs.push({ label: t('appShell.breadcrumbTrainingsfokus'), onClick: () => navigate('/app/trainingsfokus') })
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
        <Route path="turnierplanung" element={<YearPlanning />} />
        <Route path="trainingsplan" element={<Trainingsplan />} />
        <Route path="videos" element={<Beispiele />} />
        <Route
          path="trainingsfokus"
          element={
            <TrainingFocusList
              onOpenEntry={(id) => navigate(`/app/trainingsfokus/${id}`)}
              onNewEntry={() => navigate('/app/trainingsfokus/neu')}
            />
          }
        />
        <Route path="trainingsfokus/:entryId" element={<TrainingFocusEditorRoute />} />
        <Route path="einstellungen" element={<Einstellungen />} />
        <Route path=":placeholderKey" element={<PlaceholderRoute />} />
      </Routes>
    </div>
  )
}

export default function AppShell() {
  const { t } = useTranslation()
  const { loading, orgId, approved } = useOrg()

  if (loading) return null
  if (!orgId) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <p style={{ color: 'var(--text-soft)', maxWidth: 360, textAlign: 'center' }}>{t('appShell.noTeam')}</p>
      </div>
    )
  }
  if (!approved) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <p style={{ color: 'var(--text-soft)', maxWidth: 360, textAlign: 'center' }}>{t('appShell.waitingApproval')}</p>
      </div>
    )
  }

  return (
    <ToastProvider>
      <AppShellInner />
    </ToastProvider>
  )
}
