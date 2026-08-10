import { Navigate, Route, Routes } from 'react-router-dom'
import { isSupabaseConfigured } from './lib/supabaseClient'
import { AuthProvider, useAuth } from './lib/AuthContext'
import { OrgProvider } from './lib/OrgContext'
import ConfigWarning from './components/ConfigWarning'
import Login from './components/Login'
import Register from './components/Register'
import AcceptInvite from './pages/AcceptInvite'
import AppShell from './components/AppShell'

// Landing.jsx (marketing text + pricing) is intentionally not routed right
// now — pricing/self-service registration isn't ready yet, see
// OrgContext.jsx's approval gate. Kept in the codebase to re-enable later
// by pointing this back at <Landing />.
function RootRoute() {
  const { session, loading } = useAuth()
  if (loading) return null
  if (session) return <Navigate to="/app" replace />
  return <Navigate to="/login" replace />
}

function PublicOnlyRoute({ children }) {
  const { session, loading } = useAuth()
  if (loading) return null
  if (session) return <Navigate to="/app" replace />
  return children
}

function ProtectedRoute({ children }) {
  const { session, loading } = useAuth()
  if (loading) return null
  if (!session) return <Navigate to="/login" replace />
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
      <Route
        path="/register"
        element={
          <PublicOnlyRoute>
            <Register />
          </PublicOnlyRoute>
        }
      />
      <Route path="/accept-invite" element={<AcceptInvite />} />
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
