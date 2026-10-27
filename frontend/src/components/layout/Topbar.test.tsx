import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { Topbar } from './Topbar'
import * as useAuthModule from '@/auth/useAuth'
import type { AuthUser, UserRole } from '@/auth/auth.types'

vi.mock('@/auth/useAuth', () => ({
  useAuth: vi.fn(),
}))

function mockAuthState(user: Partial<AuthUser> | null) {
  vi.mocked(useAuthModule.useAuth).mockReturnValue({
    user: user as AuthUser | null,
    state: user ? 'authenticated' : 'guest',
    isAuthenticated: !!user,
    isGuest: !user,
    error: null,
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    refreshSession: vi.fn(),
    migrationPending: false,
    confirmMigration: vi.fn(),
    declineMigration: vi.fn(),
  })
}

describe('Topbar Admin Access Shortcut Visibility', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows "Trang quản trị" shortcut linking to /admin ONLY for admin role', () => {
    mockAuthState({
      id: 'usr-admin-1',
      email: 'admin@example.com',
      displayName: 'Quản trị viên Hệ thống',
      role: 'admin',
      createdAt: '2026-10-27T00:00:00Z',
    })

    render(
      <MemoryRouter>
        <Topbar />
      </MemoryRouter>
    )

    // Open user menu
    const trigger = screen.getByLabelText('Menu tài khoản')
    fireEvent.click(trigger)

    // Admin shortcut must be visible
    const adminLink = screen.getByRole('menuitem', { name: /Trang quản trị/i })
    expect(adminLink).toBeInTheDocument()
    expect(adminLink).toHaveAttribute('href', '/admin')

    // Role badge should also be displayed
    expect(screen.getByText('Quản trị viên')).toBeInTheDocument()
  })

  const nonAdminRoles: UserRole[] = ['learner', 'teacher', 'content', 'support']

  nonAdminRoles.forEach((role) => {
    it(`does NOT show "Trang quản trị" shortcut for role "${role}"`, () => {
      mockAuthState({
        id: `usr-${role}-1`,
        email: `${role}@example.com`,
        displayName: `User ${role}`,
        role,
        createdAt: '2026-10-27T00:00:00Z',
      })

      render(
        <MemoryRouter>
          <Topbar />
        </MemoryRouter>
      )

      // Open user menu
      const trigger = screen.getByLabelText('Menu tài khoản')
      fireEvent.click(trigger)

      // Admin shortcut must NOT be present
      expect(screen.queryByRole('menuitem', { name: /Trang quản trị/i })).not.toBeInTheDocument()
      expect(screen.queryByText('Trang quản trị')).not.toBeInTheDocument()
    })
  })

  it('does NOT show "Trang quản trị" shortcut for unauthenticated guest', () => {
    mockAuthState(null)

    render(
      <MemoryRouter>
        <Topbar />
      </MemoryRouter>
    )

    expect(screen.queryByLabelText('Menu tài khoản')).not.toBeInTheDocument()
    expect(screen.queryByText('Trang quản trị')).not.toBeInTheDocument()
    expect(screen.getByText('Đăng nhập')).toBeInTheDocument()
  })
})
