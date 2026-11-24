import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { RoleGuard } from './RoleGuard'
import { PermissionGuard } from './PermissionGuard'
import * as useAuthModule from './useAuth'

describe('RoleGuard & PermissionGuard — Prototype Safety Suite', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    delete (window as any).__STUDY_AI_PROTOTYPE_MODE__
  })

  it('RoleGuard redirects unauthenticated guest to login in standard mode', () => {
    vi.spyOn(useAuthModule, 'useAuth').mockReturnValue({
      user: null,
      state: 'guest',
      isAuthenticated: false,
      isGuest: true,
      error: null,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      refreshSession: vi.fn(),
      migrationPending: false,
      confirmMigration: vi.fn(),
      declineMigration: vi.fn(),
    })

    render(
      <MemoryRouter initialEntries={['/admin/dashboard']}>
        <Routes>
          <Route path="/login" element={<div>Login Page</div>} />
          <Route
            path="/admin/dashboard"
            element={
              <RoleGuard allowedRoles="admin">
                <div>Admin Secret</div>
              </RoleGuard>
            }
          />
        </Routes>
      </MemoryRouter>
    )

    expect(screen.getByText('Login Page')).toBeInTheDocument()
    expect(screen.queryByText('Admin Secret')).not.toBeInTheDocument()
  })

  it('RoleGuard shows UnauthorizedPage when student attempts to access admin role', () => {
    vi.spyOn(useAuthModule, 'useAuth').mockReturnValue({
      user: {
        id: 'usr-student',
        email: 'student@studyai.edu.vn',
        displayName: 'Học sinh',
        role: 'student',
      } as any,
      state: 'authenticated',
      isAuthenticated: true,
      isGuest: false,
      error: null,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      refreshSession: vi.fn(),
      migrationPending: false,
      confirmMigration: vi.fn(),
      declineMigration: vi.fn(),
    })

    render(
      <MemoryRouter initialEntries={['/admin/dashboard']}>
        <Routes>
          <Route
            path="/admin/dashboard"
            element={
              <RoleGuard allowedRoles="admin">
                <div>Admin Secret</div>
              </RoleGuard>
            }
          />
        </Routes>
      </MemoryRouter>
    )

    expect(screen.queryByText('Admin Secret')).not.toBeInTheDocument()
    expect(screen.getByText(/403 FORBIDDEN/i)).toBeInTheDocument()
  })

  it('PermissionGuard redirects unauthenticated guest to login', () => {
    vi.spyOn(useAuthModule, 'useAuth').mockReturnValue({
      user: null,
      state: 'guest',
      isAuthenticated: false,
      isGuest: true,
      error: null,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      refreshSession: vi.fn(),
      migrationPending: false,
      confirmMigration: vi.fn(),
      declineMigration: vi.fn(),
    })

    render(
      <MemoryRouter initialEntries={['/content/editor']}>
        <Routes>
          <Route path="/login" element={<div>Login Page</div>} />
          <Route
            path="/content/editor"
            element={
              <PermissionGuard permission="manage_content">
                <div>Editor Secret</div>
              </PermissionGuard>
            }
          />
        </Routes>
      </MemoryRouter>
    )

    expect(screen.getByText('Login Page')).toBeInTheDocument()
    expect(screen.queryByText('Editor Secret')).not.toBeInTheDocument()
  })
})
