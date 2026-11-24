import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { WorkspaceShell } from './WorkspaceShell'
import * as useAuthModule from '@/auth/useAuth'

describe('WorkspaceShell — Identity & Production Safety Suite', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    delete (window as any).__STUDY_AI_PROTOTYPE_MODE__

    vi.spyOn(useAuthModule, 'useAuth').mockReturnValue({
      user: {
        id: 'usr-admin-01',
        email: 'real.admin@school.edu.vn',
        displayName: 'Trần Thị B',
        role: 'admin',
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
  })

  it('renders authenticated staff identity truthfully and does not fabricate staff@study-ai.edu.vn', () => {
    vi.spyOn(useAuthModule, 'useAuth').mockReturnValue({
      user: {
        id: 'usr-admin-01',
        email: 'real.admin@school.edu.vn',
        displayName: 'Trần Thị B',
        role: 'admin',
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
      <MemoryRouter>
        <WorkspaceShell role="admin">
          <div>Admin Content</div>
        </WorkspaceShell>
      </MemoryRouter>
    )

    expect(screen.getByText('Trần Thị B')).toBeInTheDocument()
    expect(screen.queryByText('staff@study-ai.edu.vn')).not.toBeInTheDocument()

    // Open account menu
    fireEvent.click(screen.getByLabelText('Menu tài khoản cá nhân'))
    expect(screen.getByText('real.admin@school.edu.vn')).toBeInTheDocument()
  })

  it('displays "Chưa đăng nhập" when user is null instead of "Nhân viên"', () => {
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
      <MemoryRouter>
        <WorkspaceShell role="content">
          <div>Content Content</div>
        </WorkspaceShell>
      </MemoryRouter>
    )

    expect(screen.getByText('Chưa đăng nhập')).toBeInTheDocument()
    expect(screen.queryByText('Nhân viên')).not.toBeInTheDocument()
    expect(screen.queryByText('staff@study-ai.edu.vn')).not.toBeInTheDocument()
  })

  it('renders empty notification state without fabricated unread count badge', () => {
    vi.spyOn(useAuthModule, 'useAuth').mockReturnValue({
      user: {
        id: 'usr-teacher-01',
        email: 'teacher@school.edu.vn',
        displayName: 'Nguyễn Văn Giáo Viên',
        role: 'teacher',
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
      <MemoryRouter>
        <WorkspaceShell role="teacher">
          <div>Teacher Content</div>
        </WorkspaceShell>
      </MemoryRouter>
    )

    // Notification badge should not be '3'
    expect(screen.queryByText('3 mới')).not.toBeInTheDocument()

    // Open notify dropdown
    fireEvent.click(screen.getByLabelText('Thông báo hệ thống'))
    expect(screen.getByText('Chưa có thông báo mới')).toBeInTheDocument()
  })

  it('renders for all three staff roles: admin, teacher, and content', () => {
    const roles: Array<'admin' | 'teacher' | 'content'> = ['admin', 'teacher', 'content']
    roles.forEach((r) => {
      const { unmount } = render(
        <MemoryRouter>
          <WorkspaceShell role={r}>
            <div>{r} child</div>
          </WorkspaceShell>
        </MemoryRouter>
      )
      expect(screen.getByText(`${r} child`)).toBeInTheDocument()
      unmount()
    })
  })
})
