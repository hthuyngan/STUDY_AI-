import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { RoleGuard } from './RoleGuard'
import * as useAuthModule from './useAuth'

vi.mock('./useAuth')

describe('RoleGuard Component', () => {
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
                <div>Admin Secret Content</div>
              </RoleGuard>
            }
          />
        </Routes>
      </MemoryRouter>
    )

    expect(screen.getByText('Không có quyền truy cập')).toBeInTheDocument()
    expect(screen.queryByText('Admin Secret Content')).not.toBeInTheDocument()
  })

  it('renders 403 Unauthorized for teacher accessing admin route', () => {
    vi.spyOn(useAuthModule, 'useAuth').mockReturnValue({
      user: {
        id: 'usr-teacher',
        email: 'teacher@example.com',
        displayName: 'Teacher User',
        role: 'teacher',
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
                <div>Admin Secret Content</div>
              </RoleGuard>
            }
          />
        </Routes>
      </MemoryRouter>
    )

    expect(screen.getByText('Không có quyền truy cập')).toBeInTheDocument()
    expect(screen.queryByText('Admin Secret Content')).not.toBeInTheDocument()
  })

  it('allows authorized admin accessing admin route', () => {
    vi.spyOn(useAuthModule, 'useAuth').mockReturnValue({
      user: {
        id: 'usr-admin',
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
                <div>Admin Secret Content</div>
              </RoleGuard>
            }
          />
        </Routes>
      </MemoryRouter>
    )

    expect(screen.getByText('Admin Secret Content')).toBeInTheDocument()
  })
})
