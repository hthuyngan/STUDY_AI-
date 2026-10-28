import { lazy, Suspense, useEffect } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from '@/auth/AuthProvider'
import { MigrationDialog } from '@/components/auth/MigrationDialog'
import { RouteLoadingFallback } from '@/components/layout/RouteLoadingFallback'
import { performBootstrapSyncIfAvailable } from '@/repositories'
import { LearnerRoutes } from '@/routes/learnerRoutes'
import { AdminRoutes } from '@/routes/adminRoutes'
import { TeacherRoutes } from '@/routes/teacherRoutes'
import { ContentRoutes } from '@/routes/contentRoutes'
import { SupportRoutes } from '@/routes/supportRoutes'

const LoginPage = lazy(() =>
  import('@/pages/Auth/LoginPage').then((m) => ({ default: m.LoginPage }))
)
const RegisterPage = lazy(() =>
  import('@/pages/Auth/RegisterPage').then((m) => ({ default: m.RegisterPage }))
)
import { UnauthorizedPage } from '@/pages/Error/UnauthorizedPage'

function App() {
  useEffect(() => {
    performBootstrapSyncIfAvailable().catch(() => {
      // Non-blocking background bootstrap sync
    })
  }, [])

  const appBasename = (import.meta.env.BASE_URL || '/').replace(/\/$/, '') || '/'

  return (
    <AuthProvider>
      <MigrationDialog />
      <BrowserRouter basename={appBasename}>
        <Routes>
          {/* Authentication Routes */}
          <Route
            path="/login"
            element={
              <Suspense fallback={<RouteLoadingFallback />}>
                <LoginPage />
              </Suspense>
            }
          />
          <Route
            path="/register"
            element={
              <Suspense fallback={<RouteLoadingFallback />}>
                <RegisterPage />
              </Suspense>
            }
          />

          {/* 403 Forbidden / Access Denied */}
          <Route path="/unauthorized" element={<UnauthorizedPage />} />

          {/* Role-based Staff Workspaces */}
          {AdminRoutes()}
          {TeacherRoutes()}
          {ContentRoutes()}
          {SupportRoutes()}

          {/* Learner Workspace (Existing AppShell) */}
          {LearnerRoutes()}

          {/* Root redirect to Dashboard */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
