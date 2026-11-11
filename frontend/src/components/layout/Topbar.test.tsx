import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { Topbar } from './Topbar'
import * as useAuthModule from '@/auth/useAuth'
import type { AuthState, AuthUser, UserRole } from '@/auth/auth.types'

const mockLogout = vi.fn().mockResolvedValue(undefined)

vi.mock('@/auth/useAuth', () => ({
  useAuth: vi.fn(),
}))

function mockAuthState(user: Partial<AuthUser> | null, state?: AuthState) {
  vi.mocked(useAuthModule.useAuth).mockReturnValue({
    user: user as AuthUser | null,
    state: state ?? (user ? 'authenticated' : 'guest'),
    isAuthenticated: !!user,
    isGuest: !user,
    error: null,
    login: vi.fn(),
    register: vi.fn(),
    logout: mockLogout,
    refreshSession: vi.fn(),
    migrationPending: false,
    confirmMigration: vi.fn(),
    declineMigration: vi.fn(),
  })
}

describe('Topbar Header & Authentication Navigation (P20-000)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Unauthenticated / Guest State', () => {
    it('shows "Đăng nhập" and "Đăng ký" buttons for guest', () => {
      mockAuthState(null)

      render(
        <MemoryRouter>
          <Topbar />
        </MemoryRouter>
      )

      expect(screen.getByRole('link', { name: /Đăng nhập/i })).toBeInTheDocument()
      expect(screen.getByRole('link', { name: /Đăng ký/i })).toBeInTheDocument()
      expect(screen.queryByLabelText('Menu tài khoản')).not.toBeInTheDocument()
    })

    it('does NOT show standalone "Trang quản trị" or workspace selector for guest', () => {
      mockAuthState(null)

      render(
        <MemoryRouter>
          <Topbar />
        </MemoryRouter>
      )

      expect(screen.queryByRole('link', { name: /Trang quản trị/i })).not.toBeInTheDocument()
      expect(screen.queryByRole('combobox', { name: /Chuyển nhanh workspace/i })).not.toBeInTheDocument()
    })
  })

  describe('Initializing Auth State', () => {
    it('does NOT show contradictory login buttons or admin shortcuts while initializing', () => {
      mockAuthState(null, 'initializing')

      render(
        <MemoryRouter>
          <Topbar />
        </MemoryRouter>
      )

      expect(screen.queryByRole('link', { name: /Đăng nhập/i })).not.toBeInTheDocument()
      expect(screen.queryByRole('link', { name: /Trang quản trị/i })).not.toBeInTheDocument()
      expect(screen.queryByLabelText('Menu tài khoản')).not.toBeInTheDocument()
    })
  })

  describe('Authenticated Admin User', () => {
    it('hides "Đăng nhập" / "Đăng ký" and shows single account dropdown with "Trang quản trị"', () => {
      mockAuthState({
        id: 'usr-admin-1',
        email: 'admin@studyai.internal',
        displayName: 'Quản trị viên Hệ thống',
        role: 'admin',
        createdAt: '2026-10-27T00:00:00Z',
      })

      render(
        <MemoryRouter>
          <Topbar />
        </MemoryRouter>
      )

      // Standalone guest buttons must be hidden
      expect(screen.queryByRole('link', { name: /Đăng nhập/i })).not.toBeInTheDocument()
      expect(screen.queryByRole('link', { name: /Đăng ký/i })).not.toBeInTheDocument()

      // No duplicate standalone admin button in header
      expect(screen.queryByRole('link', { name: /Trang quản trị/i })).not.toBeInTheDocument()

      // Single account dropdown
      const trigger = screen.getByLabelText('Menu tài khoản')
      expect(trigger).toBeInTheDocument()
      fireEvent.click(trigger)

      // Admin item inside menu
      const adminLink = screen.getByRole('menuitem', { name: /Trang quản trị/i })
      expect(adminLink).toBeInTheDocument()
      expect(adminLink).toHaveAttribute('href', '/admin')
      expect(screen.getByText('Quản trị viên')).toBeInTheDocument()
    })
  })

  describe('Authenticated Role-Specific Navigation', () => {
    it('shows "Không gian giáo viên" inside dropdown for teacher and hides "Trang quản trị"', () => {
      mockAuthState({
        id: 'usr-teacher-1',
        email: 'teacher@studyai.internal',
        displayName: 'Giáo viên Toán',
        role: 'teacher',
        createdAt: '2026-10-27T00:00:00Z',
      })

      render(
        <MemoryRouter>
          <Topbar />
        </MemoryRouter>
      )

      expect(screen.queryByRole('link', { name: /Đăng nhập/i })).not.toBeInTheDocument()
      expect(screen.queryByRole('link', { name: /Trang quản trị/i })).not.toBeInTheDocument()

      const trigger = screen.getByLabelText('Menu tài khoản')
      fireEvent.click(trigger)

      const teacherLink = screen.getByRole('menuitem', { name: /Không gian giáo viên/i })
      expect(teacherLink).toBeInTheDocument()
      expect(teacherLink).toHaveAttribute('href', '/teacher')
      expect(screen.getByText('Giáo viên')).toBeInTheDocument()
      expect(screen.queryByRole('menuitem', { name: /Trang quản trị/i })).not.toBeInTheDocument()
    })

    it('shows "Bảng điều khiển học tập" inside dropdown for learner and hides "Trang quản trị"', () => {
      mockAuthState({
        id: 'usr-learner-1',
        email: 'learner@studyai.internal',
        displayName: 'Học viên Nguyễn Văn A',
        role: 'learner',
        createdAt: '2026-10-27T00:00:00Z',
      })

      render(
        <MemoryRouter>
          <Topbar />
        </MemoryRouter>
      )

      expect(screen.queryByRole('link', { name: /Đăng nhập/i })).not.toBeInTheDocument()
      expect(screen.queryByRole('link', { name: /Trang quản trị/i })).not.toBeInTheDocument()

      const trigger = screen.getByLabelText('Menu tài khoản')
      fireEvent.click(trigger)

      const learnerLink = screen.getByRole('menuitem', { name: /Bảng điều khiển học tập/i })
      expect(learnerLink).toBeInTheDocument()
      expect(learnerLink).toHaveAttribute('href', '/dashboard')
      expect(screen.getByText('Học viên')).toBeInTheDocument()
      expect(screen.queryByRole('menuitem', { name: /Trang quản trị/i })).not.toBeInTheDocument()
    })

    it('shows "Quản lý nội dung" inside dropdown for content staff', () => {
      mockAuthState({
        id: 'usr-content-1',
        email: 'content@studyai.internal',
        displayName: 'Biên tập viên',
        role: 'content',
        createdAt: '2026-10-27T00:00:00Z',
      })

      render(
        <MemoryRouter>
          <Topbar />
        </MemoryRouter>
      )

      const trigger = screen.getByLabelText('Menu tài khoản')
      fireEvent.click(trigger)

      const contentLink = screen.getByRole('menuitem', { name: /Quản lý nội dung/i })
      expect(contentLink).toBeInTheDocument()
      expect(contentLink).toHaveAttribute('href', '/content')
      expect(screen.getByText('Biên tập nội dung')).toBeInTheDocument()
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

        const trigger = screen.getByLabelText('Menu tài khoản')
        fireEvent.click(trigger)

        expect(screen.queryByRole('menuitem', { name: /Trang quản trị/i })).not.toBeInTheDocument()
        expect(screen.queryByRole('link', { name: /Trang quản trị/i })).not.toBeInTheDocument()
      })
    })
  })

  describe('Logout Interaction', () => {
    it('calls logout when clicking "Đăng xuất" item in user dropdown', async () => {
      mockAuthState({
        id: 'usr-test-1',
        email: 'user@studyai.internal',
        displayName: 'Test User',
        role: 'learner',
        createdAt: '2026-10-27T00:00:00Z',
      })

      render(
        <MemoryRouter>
          <Topbar />
        </MemoryRouter>
      )

      const trigger = screen.getByLabelText('Menu tài khoản')
      fireEvent.click(trigger)

      const logoutBtn = screen.getByRole('menuitem', { name: /Đăng xuất/i })
      await act(async () => {
        fireEvent.click(logoutBtn)
      })

      expect(mockLogout).toHaveBeenCalledTimes(1)
    })
  })
})
