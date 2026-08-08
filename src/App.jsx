import { Navigate, Route, Routes } from 'react-router-dom'
import { isSupabaseConfigured } from './lib/supabaseClient'
import { AuthProvider, useAuth } from './lib/AuthContext'
import { OrgProvider } from './lib/OrgContext'
import ConfigWarning from './components/ConfigWarning'
import Login from './components/Login'
import Register from './components/Register'
import Landing from './pages/Landing'
import AppShell from './components/AppShell'

function RootRoute() {
  const { session, loading } = useAuth()
  if (loading) return null
  if (session) return <Navigate to="/app" replace />
  return <Landing />
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
