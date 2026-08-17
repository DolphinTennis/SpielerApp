import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { isSupabaseConfigured } from './lib/supabaseClient'
import { AuthProvider, useAuth } from './lib/AuthContext'
import { OrgProvider } from './lib/OrgContext'
import ConfigWarning from './components/ConfigWarning'
import Login from './components/Login'
import AcceptInvite from './pages/AcceptInvite'
import ResetPassword from './pages/ResetPassword'
import AppShell from './components/AppShell'

// No public landing page in this app — everything about marketing, pricing
// and self-service purchase lives in a separate project now (see
// docs/vermarktung-ausgliederung.md). `/` therefore only decides whether the
// visitor is already signed in.
function RootRoute() {
  const { session, loading } = useAuth()
  if (loading) return null
  if (session) return <Navigate to="/app" replace />
  return <Navigate to="/login" replace />
}

function PublicOnlyRoute({ children }) {
  const { session, loading } = useAuth()
  const location = useLocation()
  if (loading) return null
  // Send the user back to whatever protected page they were headed for
  // before ProtectedRoute detoured them here — without this, login always
  // dumped everyone on /app regardless of where they actually meant to go
  // (e.g. a bookmarked deep link into /app/...).
  if (session) return <Navigate to={location.state?.from?.pathname || '/app'} replace />
  return children
}

function ProtectedRoute({ children }) {
  const { session, loading } = useAuth()
  const location = useLocation()
  if (loading) return null
  if (!session) return <Navigate to="/login" state={{ from: location }} replace />
  return children
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<RootRoute />} />
      <Route
        path="/login"
        element={
          <PublicOnlyRoute>
            <Login />
          </PublicOnlyRoute>
        }
      />
      {/* No /register route: self-registration is closed. Anyone typing the
          URL lands on /login via the catch-all below. The database side is
          what actually shuts it — see enable_signup in supabase/config.toml.
          Members still arrive by invitation, which goes through
          /accept-invite and the admin API, not through signup. */}
      <Route path="/accept-invite" element={<AcceptInvite />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route
        path="/app/*"
        element={
          <ProtectedRoute>
            <OrgProvider>
              <AppShell />
            </OrgProvider>
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  if (!isSupabaseConfigured) return <ConfigWarning />

  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  )
}
