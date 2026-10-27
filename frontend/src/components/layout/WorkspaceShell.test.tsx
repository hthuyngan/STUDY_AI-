import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { WorkspaceShell } from './WorkspaceShell'
import * as useAuthModule from '@/auth/useAuth'

vi.mock('@/auth/useAuth', () => ({
  useAuth: vi.fn(),
}))

describe('WorkspaceShell Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useAuthModule.useAuth).mockReturnValue({
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
  })

  it('renders "Giao diện học viên" button linking to /dashboard', () => {
    render(
      <MemoryRouter initialEntries={['/admin']}>
        <WorkspaceShell role="admin">
          <div>Admin Dashboard View</div>
        </WorkspaceShell>
      </MemoryRouter>
    )

    const backLinks = screen.getAllByRole('link', { name: /Giao diện học viên|Quay lại học viên/i })
    expect(backLinks.length).toBeGreaterThan(0)
    expect(backLinks[0]).toHaveAttribute('href', '/dashboard')
  })

  it('renders workspace switcher allowing switching between roles', () => {
    render(
      <MemoryRouter initialEntries={['/admin']}>
        <WorkspaceShell role="admin">
          <div>Admin Content</div>
        </WorkspaceShell>
      </MemoryRouter>
    )

    const switcher = screen.getByLabelText(/Chuyển không gian làm việc/i)
    expect(switcher).toBeInTheDocument()
    expect(switcher).toHaveValue('admin')
  })
})
