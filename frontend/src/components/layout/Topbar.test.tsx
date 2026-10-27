import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { Topbar } from './Topbar'
import * as useAuthModule from '@/auth/useAuth'
import * as prototypeConfig from '@/config/prototype'
import type { AuthUser, UserRole } from '@/auth/auth.types'

vi.mock('@/auth/useAuth', () => ({
  useAuth: vi.fn(),
}))

vi.mock('@/config/prototype', () => ({
  isPrototypeMode: vi.fn(),
  isStaffUiPreviewEnabled: vi.fn(),
  FRONTEND_PROTOTYPE_MODE: true,
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

describe('Topbar Admin Access & Prototype Mode', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('In Prototype Mode (isPrototypeMode = true)', () => {
    beforeEach(() => {
      vi.mocked(prototypeConfig.isPrototypeMode).mockReturnValue(true)
      vi.mocked(prototypeConfig.isStaffUiPreviewEnabled).mockReturnValue(true)
    })

    it('shows "Trang quản trị" button for guest', () => {
      mockAuthState(null)

      render(
        <MemoryRouter>
          <Topbar />
        </MemoryRouter>
      )

      const quickBtn = screen.getByRole('link', { name: /Trang quản trị/i })
      expect(quickBtn).toBeInTheDocument()
      expect(quickBtn).toHaveAttribute('href', '/admin')
    })

    it('shows "Trang quản trị" button for learner', () => {
      mockAuthState({
        id: 'usr-learner-1',
        email: 'learner@example.com',
        displayName: 'Học viên A',
        role: 'learner',
        createdAt: '2026-10-27T00:00:00Z',
      })

      render(
        <MemoryRouter>
          <Topbar />
        </MemoryRouter>
      )

      const quickBtn = screen.getByRole('link', { name: /Trang quản trị/i })
      expect(quickBtn).toBeInTheDocument()
      expect(quickBtn).toHaveAttribute('href', '/admin')
    })

    it('shows "Trang quản trị" button for teacher', () => {
      mockAuthState({
        id: 'usr-teacher-1',
        email: 'teacher@example.com',
        displayName: 'Giáo viên B',
        role: 'teacher',
        createdAt: '2026-10-27T00:00:00Z',
      })

      render(
        <MemoryRouter>
          <Topbar />
        </MemoryRouter>
      )

      const quickBtn = screen.getByRole('link', { name: /Trang quản trị/i })
      expect(quickBtn).toBeInTheDocument()
      expect(quickBtn).toHaveAttribute('href', '/admin')
    })
  })

  describe('In Production Mode (isPrototypeMode = false)', () => {
    beforeEach(() => {
      vi.mocked(prototypeConfig.isPrototypeMode).mockReturnValue(false)
      vi.mocked(prototypeConfig.isStaffUiPreviewEnabled).mockReturnValue(false)
    })

    it('shows "Trang quản trị" ONLY for admin role', () => {
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

      // Admin shortcut must be visible in menu
      const adminLink = screen.getByRole('menuitem', { name: /Trang quản trị/i })
      expect(adminLink).toBeInTheDocument()
      expect(adminLink).toHaveAttribute('href', '/admin')
      expect(screen.getByText('Quản trị viên')).toBeInTheDocument()
    })

    const nonAdminRoles: UserRole[] = ['learner', 'teacher', 'content', 'support']

    nonAdminRoles.forEach((role) => {
      it(`does NOT show "Trang quản trị" shortcut for role "${role}" in production`, () => {
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
        expect(screen.queryByRole('link', { name: /Trang quản trị/i })).not.toBeInTheDocument()
      })
    })

    it('does NOT show "Trang quản trị" shortcut for unauthenticated guest in production', () => {
      mockAuthState(null)

      render(
        <MemoryRouter>
          <Topbar />
        </MemoryRouter>
      )

      expect(screen.queryByLabelText('Menu tài khoản')).not.toBeInTheDocument()
      expect(screen.queryByRole('link', { name: /Trang quản trị/i })).not.toBeInTheDocument()
    })
  })
})
