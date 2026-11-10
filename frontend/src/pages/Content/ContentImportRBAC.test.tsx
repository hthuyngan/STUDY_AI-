import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes } from 'react-router-dom'
import { ContentRoutes } from '@/routes/contentRoutes'
import * as useAuthModule from '@/auth/useAuth'
import * as staffPreviewModule from '@/config/staffPreview'

vi.mock('@/auth/useAuth')
vi.mock('@/config/staffPreview', () => ({
  isStaffUiPreviewEnabled: vi.fn(),
  isPrototypeMode: vi.fn(),
  FRONTEND_PROTOTYPE_MODE: false,
}))

describe('Curriculum Import RBAC & Role Enforcement Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(staffPreviewModule.isStaffUiPreviewEnabled).mockReturnValue(false)
  })

  it('1. Blocks learner from accessing /content/import with 403 Forbidden state', () => {
    vi.spyOn(useAuthModule, 'useAuth').mockReturnValue({
      user: {
        id: 'usr-learner-1',
        email: 'learner@studyai.internal',
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
      <MemoryRouter initialEntries={['/content/import']}>
        <Routes>{ContentRoutes()}</Routes>
      </MemoryRouter>
    )

    expect(screen.getByText('403 FORBIDDEN')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /Không có quyền truy cập/i })).toBeInTheDocument()
    expect(screen.queryByText('Nhập giáo trình hàng loạt')).not.toBeInTheDocument()
  })

  it('2. Allows content staff to access /content/import successfully', () => {
    vi.spyOn(useAuthModule, 'useAuth').mockReturnValue({
      user: {
        id: 'usr-content-1',
        email: 'content@studyai.internal',
        displayName: 'Content Manager',
        role: 'content',
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
      <MemoryRouter initialEntries={['/content/import']}>
        <Routes>{ContentRoutes()}</Routes>
      </MemoryRouter>
    )

    expect(screen.getByText('Nhập giáo trình hàng loạt')).toBeInTheDocument()
    expect(screen.queryByText(/Không có quyền truy cập/i)).not.toBeInTheDocument()
  })

  it('3. Allows admin to access /content/import successfully', () => {
    vi.spyOn(useAuthModule, 'useAuth').mockReturnValue({
      user: {
        id: 'usr-admin-1',
        email: 'admin@studyai.internal',
        displayName: 'Administrator',
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
      <MemoryRouter initialEntries={['/content/import']}>
        <Routes>{ContentRoutes()}</Routes>
      </MemoryRouter>
    )

    expect(screen.getByText('Nhập giáo trình hàng loạt')).toBeInTheDocument()
    expect(screen.queryByText(/Không có quyền truy cập/i)).not.toBeInTheDocument()
  })
})
