import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { RoleGuard } from './RoleGuard'
import * as useAuthModule from './useAuth'
import * as staffPreviewModule from '@/config/staffPreview'

vi.mock('./useAuth')
vi.mock('@/config/staffPreview', () => ({
  isStaffUiPreviewEnabled: vi.fn(),
  isPrototypeMode: vi.fn(),
  FRONTEND_PROTOTYPE_MODE: true,
}))

describe('RoleGuard Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('When Prototype / Preview Mode is ENABLED', () => {
    beforeEach(() => {
      vi.mocked(staffPreviewModule.isStaffUiPreviewEnabled).mockReturnValue(true)
    })

    it('allows guest to access /admin directly without redirect', () => {
      vi.spyOn(useAuthModule, 'useAuth').mockReturnValue({
        user: null,
        state: 'guest',
        error: null,
        isAuthenticated: false,
        isGuest: true,
        login: vi.fn(),
        register: vi.fn(),
        logout: vi.fn(),
        refreshSession: vi.fn(),
        migrationPending: false,
        confirmMigration: vi.fn(),
        declineMigration: vi.fn(),
      })

      render(
        <MemoryRouter initialEntries={['/admin']}>
          <Routes>
            <Route
              path="/admin"
              element={
                <RoleGuard allowedRoles={['admin']}>
                  <div>Admin Content Prototype</div>
                </RoleGuard>
              }
            />
            <Route path="/login" element={<div>Login Page Target</div>} />
          </Routes>
        </MemoryRouter>
      )

      expect(screen.getByText('Admin Content Prototype')).toBeInTheDocument()
      expect(screen.queryByText('Login Page Target')).not.toBeInTheDocument()
    })

    it('allows learner to access /admin directly without 403', () => {
      vi.spyOn(useAuthModule, 'useAuth').mockReturnValue({
        user: {
          id: 'usr-1',
          email: 'learner@example.com',
          displayName: 'Learner User',
          role: 'learner',
          createdAt: '2026-10-27T00:00:00Z',
        },
        state: 'authenticated',
        error: null,
        isAuthenticated: true,
        isGuest: false,
        login: vi.fn(),
        register: vi.fn(),
        logout: vi.fn(),
        refreshSession: vi.fn(),
        migrationPending: false,
        confirmMigration: vi.fn(),
        declineMigration: vi.fn(),
      })

      render(
        <MemoryRouter initialEntries={['/admin']}>
          <Routes>
            <Route
              path="/admin"
              element={
                <RoleGuard allowedRoles={['admin']}>
                  <div>Admin Content Prototype for Learner</div>
                </RoleGuard>
              }
            />
          </Routes>
        </MemoryRouter>
      )

      expect(screen.getByText('Admin Content Prototype for Learner')).toBeInTheDocument()
      expect(screen.queryByText(/Không có quyền truy cập/i)).not.toBeInTheDocument()
    })
  })

  describe('When Prototype / Preview Mode is DISABLED (Production RBAC)', () => {
    beforeEach(() => {
      vi.mocked(staffPreviewModule.isStaffUiPreviewEnabled).mockReturnValue(false)
    })

    it('redirects guest to /login', () => {
      vi.spyOn(useAuthModule, 'useAuth').mockReturnValue({
        user: null,
        state: 'guest',
        error: null,
        isAuthenticated: false,
        isGuest: true,
        login: vi.fn(),
        register: vi.fn(),
        logout: vi.fn(),
        refreshSession: vi.fn(),
        migrationPending: false,
        confirmMigration: vi.fn(),
        declineMigration: vi.fn(),
      })

      render(
        <MemoryRouter initialEntries={['/admin']}>
          <Routes>
            <Route
              path="/admin"
              element={
                <RoleGuard allowedRoles={['admin']}>
                  <div>Admin Content</div>
                </RoleGuard>
              }
            />
            <Route path="/login" element={<div>Login Page Target</div>} />
          </Routes>
        </MemoryRouter>
      )

      expect(screen.getByText('Login Page Target')).toBeInTheDocument()
      expect(screen.queryByText('Admin Content')).not.toBeInTheDocument()
    })

    it('renders 403 Unauthorized for learner accessing admin route', () => {
      vi.spyOn(useAuthModule, 'useAuth').mockReturnValue({
        user: {
          id: 'usr-1',
          email: 'learner@example.com',
          displayName: 'Learner User',
          role: 'learner',
          createdAt: '2026-10-27T00:00:00Z',
        },
        state: 'authenticated',
        error: null,
        isAuthenticated: true,
        isGuest: false,
        login: vi.fn(),
        register: vi.fn(),
        logout: vi.fn(),
        refreshSession: vi.fn(),
        migrationPending: false,
        confirmMigration: vi.fn(),
        declineMigration: vi.fn(),
      })

      render(
        <MemoryRouter initialEntries={['/admin']}>
          <Routes>
            <Route
              path="/admin"
              element={
                <RoleGuard allowedRoles={['admin']}>
                  <div>Admin Content</div>
                </RoleGuard>
              }
            />
          </Routes>
        </MemoryRouter>
      )

      expect(screen.getByRole('heading', { name: /Không có quyền truy cập/i })).toBeInTheDocument()
      expect(screen.queryByText('Admin Content')).not.toBeInTheDocument()
    })

    it('renders children for admin accessing admin route', () => {
      vi.spyOn(useAuthModule, 'useAuth').mockReturnValue({
        user: {
          id: 'usr-2',
          email: 'admin@example.com',
          displayName: 'Admin User',
          role: 'admin',
          createdAt: '2026-10-27T00:00:00Z',
        },
        state: 'authenticated',
        error: null,
        isAuthenticated: true,
        isGuest: false,
        login: vi.fn(),
        register: vi.fn(),
        logout: vi.fn(),
        refreshSession: vi.fn(),
        migrationPending: false,
        confirmMigration: vi.fn(),
        declineMigration: vi.fn(),
      })

      render(
        <MemoryRouter initialEntries={['/admin']}>
          <Routes>
            <Route
              path="/admin"
              element={
                <RoleGuard allowedRoles={['admin']}>
                  <div>Admin Content Allowed</div>
                </RoleGuard>
              }
            />
          </Routes>
        </MemoryRouter>
      )

      expect(screen.getByText('Admin Content Allowed')).toBeInTheDocument()
    })

    it('renders loading spinner while auth state is initializing', () => {
      vi.spyOn(useAuthModule, 'useAuth').mockReturnValue({
        user: null,
        state: 'initializing',
        error: null,
        isAuthenticated: false,
        isGuest: false,
        login: vi.fn(),
        register: vi.fn(),
        logout: vi.fn(),
        refreshSession: vi.fn(),
        migrationPending: false,
        confirmMigration: vi.fn(),
        declineMigration: vi.fn(),
      })

      render(
        <MemoryRouter initialEntries={['/admin']}>
          <Routes>
            <Route
              path="/admin"
              element={
                <RoleGuard allowedRoles={['admin']}>
                  <div>Admin Content</div>
                </RoleGuard>
              }
            />
          </Routes>
        </MemoryRouter>
      )

      expect(screen.getByText('Đang kiểm tra quyền truy cập...')).toBeInTheDocument()
      expect(screen.queryByText('Admin Content')).not.toBeInTheDocument()
    })
  })
})
