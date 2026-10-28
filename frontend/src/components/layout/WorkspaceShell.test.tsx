import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { WorkspaceShell } from './WorkspaceShell'
import * as useAuthModule from '@/auth/useAuth'

vi.mock('@/auth/useAuth', () => ({
  useAuth: vi.fn(),
}))

describe('WorkspaceShell & Admin Navigation Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
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

  it('renders all required admin navigation items with correct hrefs', () => {
    render(
      <MemoryRouter initialEntries={['/admin']}>
        <WorkspaceShell role="admin">
          <div>Dashboard Content</div>
        </WorkspaceShell>
      </MemoryRouter>
    )

    const dashboardLink = screen.getByRole('link', { name: /Bảng điều khiển/i })
    expect(dashboardLink).toHaveAttribute('href', '/admin')

    const usersLink = screen.getByRole('link', { name: /Danh sách người dùng/i })
    expect(usersLink).toHaveAttribute('href', '/admin/users')

    const rolesLink = screen.getByRole('link', { name: /Phân quyền & Vai trò/i })
    expect(rolesLink).toHaveAttribute('href', '/admin/roles')

    const systemLink = screen.getByRole('link', { name: /Trạng thái hệ thống/i })
    expect(systemLink).toHaveAttribute('href', '/admin/system')

    const returnLinks = screen.getAllByRole('link', { name: /Quay lại học viên|Giao diện học viên/i })
    expect(returnLinks.length).toBeGreaterThan(0)
    expect(returnLinks.some((l) => l.getAttribute('href') === '/dashboard')).toBe(true)
  })

  it('highlights "Bảng điều khiển" as active when at /admin', () => {
    render(
      <MemoryRouter initialEntries={['/admin']}>
        <WorkspaceShell role="admin">
          <div>Dashboard View</div>
        </WorkspaceShell>
      </MemoryRouter>
    )

    const dashboardLink = screen.getByRole('link', { name: /Bảng điều khiển/i })
    expect(dashboardLink).toHaveClass('active')
    expect(dashboardLink).toHaveAttribute('aria-current', 'page')

    const usersLink = screen.getByRole('link', { name: /Danh sách người dùng/i })
    expect(usersLink).not.toHaveClass('active')
    expect(usersLink).not.toHaveAttribute('aria-current')

    expect(screen.getByText('Quản trị hệ thống')).toBeInTheDocument()
    expect(document.querySelector('.workspace-current-title')).toHaveTextContent('Bảng điều khiển')
  })

  it('highlights "Danh sách người dùng" when at /admin/users', () => {
    render(
      <MemoryRouter initialEntries={['/admin/users']}>
        <WorkspaceShell role="admin">
          <div>Users List View</div>
        </WorkspaceShell>
      </MemoryRouter>
    )

    const usersLink = screen.getByRole('link', { name: /Danh sách người dùng/i })
    expect(usersLink).toHaveClass('active')
    expect(usersLink).toHaveAttribute('aria-current', 'page')

    const dashboardLink = screen.getByRole('link', { name: /Bảng điều khiển/i })
    expect(dashboardLink).not.toHaveClass('active')

    // Topbar breadcrumb shows active title
    expect(document.querySelector('.workspace-current-title')).toHaveTextContent('Danh sách người dùng')
  })

  it('keeps "Danh sách người dùng" active on nested user detail route /admin/users/:id', () => {
    render(
      <MemoryRouter initialEntries={['/admin/users/usr-001']}>
        <WorkspaceShell role="admin">
          <div>User Detail View</div>
        </WorkspaceShell>
      </MemoryRouter>
    )

    const usersLink = screen.getByRole('link', { name: /Danh sách người dùng/i })
    expect(usersLink).toHaveClass('active')

    const dashboardLink = screen.getByRole('link', { name: /Bảng điều khiển/i })
    expect(dashboardLink).not.toHaveClass('active')

    // Breadcrumb keeps "Danh sách người dùng" for subroute
    expect(document.querySelector('.workspace-current-title')).toHaveTextContent('Danh sách người dùng')
  })

  it('highlights "Phân quyền & Vai trò" when at /admin/roles', () => {
    render(
      <MemoryRouter initialEntries={['/admin/roles']}>
        <WorkspaceShell role="admin">
          <div>Roles View</div>
        </WorkspaceShell>
      </MemoryRouter>
    )

    const rolesLink = screen.getByRole('link', { name: /Phân quyền & Vai trò/i })
    expect(rolesLink).toHaveClass('active')

    const dashboardLink = screen.getByRole('link', { name: /Bảng điều khiển/i })
    expect(dashboardLink).not.toHaveClass('active')

    expect(document.querySelector('.workspace-current-title')).toHaveTextContent('Phân quyền & Vai trò')
  })

  it('highlights "Trạng thái hệ thống" when at /admin/system', () => {
    render(
      <MemoryRouter initialEntries={['/admin/system']}>
        <WorkspaceShell role="admin">
          <div>System View</div>
        </WorkspaceShell>
      </MemoryRouter>
    )

    const systemLink = screen.getByRole('link', { name: /Trạng thái hệ thống/i })
    expect(systemLink).toHaveClass('active')

    expect(document.querySelector('.workspace-current-title')).toHaveTextContent('Trạng thái hệ thống')
  })

  it('navigates seamlessly across admin routes and updates view', async () => {
    const user = userEvent.setup()

    render(
      <MemoryRouter initialEntries={['/admin']}>
        <Routes>
          <Route path="/admin" element={<WorkspaceShell role="admin" />}>
            <Route index element={<div data-testid="page-dashboard">Page: Dashboard</div>} />
            <Route path="users" element={<div data-testid="page-users">Page: Users</div>} />
            <Route path="roles" element={<div data-testid="page-roles">Page: Roles</div>} />
            <Route path="system" element={<div data-testid="page-system">Page: System</div>} />
          </Route>
          <Route path="/dashboard" element={<div data-testid="page-learner">Page: Learner</div>} />
        </Routes>
      </MemoryRouter>
    )

    // Initially at dashboard
    expect(screen.getByTestId('page-dashboard')).toBeInTheDocument()

    // Click "Danh sách người dùng"
    await user.click(screen.getByRole('link', { name: /Danh sách người dùng/i }))
    expect(screen.getByTestId('page-users')).toBeInTheDocument()

    // Click "Phân quyền & Vai trò"
    await user.click(screen.getByRole('link', { name: /Phân quyền & Vai trò/i }))
    expect(screen.getByTestId('page-roles')).toBeInTheDocument()

    // Click "Trạng thái hệ thống"
    await user.click(screen.getByRole('link', { name: /Trạng thái hệ thống/i }))
    expect(screen.getByTestId('page-system')).toBeInTheDocument()

    // Click "Bảng điều khiển"
    await user.click(screen.getByRole('link', { name: /Bảng điều khiển/i }))
    expect(screen.getByTestId('page-dashboard')).toBeInTheDocument()

    // Click "Quay lại học viên" from bottom sidebar
    const returnBottomLink = screen.getByRole('link', { name: /Quay lại học viên/i })
    await user.click(returnBottomLink)
    expect(screen.getByTestId('page-learner')).toBeInTheDocument()
  })

  it('supports sidebar collapse/expand toggle and persists to localStorage', async () => {
    const user = userEvent.setup()

    render(
      <MemoryRouter initialEntries={['/admin']}>
        <WorkspaceShell role="admin">
          <div>Dashboard View</div>
        </WorkspaceShell>
      </MemoryRouter>
    )

    const sidebar = screen.getByLabelText(/Thanh điều hướng Quản trị hệ thống/i)
    expect(sidebar).not.toHaveClass('collapsed')

    // Find collapse button
    const collapseBtn = screen.getByRole('button', { name: /Thu gọn thanh điều hướng/i })
    await user.click(collapseBtn)

    expect(sidebar).toHaveClass('collapsed')
    expect(localStorage.getItem('study_ai_workspace_sidebar_collapsed')).toBe('true')

    // Re-expand
    const expandBtn = screen.getByRole('button', { name: /Mở rộng thanh điều hướng/i })
    await user.click(expandBtn)
    expect(sidebar).not.toHaveClass('collapsed')
    expect(localStorage.getItem('study_ai_workspace_sidebar_collapsed')).toBe('false')
  })

  it('supports Ctrl+B keyboard shortcut to toggle sidebar collapse', () => {
    render(
      <MemoryRouter initialEntries={['/admin']}>
        <WorkspaceShell role="admin">
          <div>Dashboard View</div>
        </WorkspaceShell>
      </MemoryRouter>
    )

    const sidebar = screen.getByLabelText(/Thanh điều hướng Quản trị hệ thống/i)
    expect(sidebar).not.toHaveClass('collapsed')

    fireEvent.keyDown(window, { key: 'b', ctrlKey: true })
    expect(sidebar).toHaveClass('collapsed')

    fireEvent.keyDown(window, { key: 'b', ctrlKey: true })
    expect(sidebar).not.toHaveClass('collapsed')
  })

  it('handles mobile drawer open, close on click, and close on Escape', async () => {
    const user = userEvent.setup()

    render(
      <MemoryRouter initialEntries={['/admin']}>
        <WorkspaceShell role="admin">
          <div>Dashboard View</div>
        </WorkspaceShell>
      </MemoryRouter>
    )

    const sidebar = screen.getByLabelText(/Thanh điều hướng Quản trị hệ thống/i)
    expect(sidebar).not.toHaveClass('mobile-open')

    // Click mobile menu hamburger button
    const hamburgerBtn = screen.getByRole('button', { name: /Mở danh mục điều hướng/i })
    await user.click(hamburgerBtn)
    expect(sidebar).toHaveClass('mobile-open')

    // Press Escape to close
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(sidebar).not.toHaveClass('mobile-open')

    // Open again and click backdrop to close
    await user.click(hamburgerBtn)
    expect(sidebar).toHaveClass('mobile-open')

    const backdrop = document.querySelector('.sidebar-mobile-backdrop')
    expect(backdrop).toBeInTheDocument()
    if (backdrop) {
      await user.click(backdrop)
    }
    expect(sidebar).not.toHaveClass('mobile-open')
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
