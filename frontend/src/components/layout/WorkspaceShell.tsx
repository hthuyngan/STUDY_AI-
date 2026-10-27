import React, { useEffect, useState } from 'react'
import {
  Menu,
  LogOut,
  Settings,
  User as UserIcon,
  ChevronDown,
} from 'lucide-react'
import { Link, useNavigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/auth/useAuth'
import { setAuthUser } from '@/auth/authSession'
import type { UserRole } from '@/auth/auth.types'
import {
  getWorkspaceConfig,
  ROLE_LABELS,
} from './workspaceNavigation'
import { WorkspaceSidebar } from './WorkspaceSidebar'
import './WorkspaceShell.css'

export interface WorkspaceShellProps {
  role: Exclude<UserRole, 'learner'>
  title?: string
  children?: React.ReactNode
}

export const WorkspaceShell: React.FC<WorkspaceShellProps> = ({
  role,
  title,
  children,
}) => {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const config = getWorkspaceConfig(role)

  const [collapsed, setCollapsed] = useState<boolean>(() => {
    return localStorage.getItem('study_ai_workspace_sidebar_collapsed') === 'true'
  })
  const [mobileOpen, setMobileOpen] = useState<boolean>(false)
  const [accountMenuOpen, setAccountMenuOpen] = useState<boolean>(false)

  const toggleCollapse = () => {
    setCollapsed((prev) => {
      const next = !prev
      localStorage.setItem('study_ai_workspace_sidebar_collapsed', String(next))
      return next
    })
  }

  // Keyboard shortcut Ctrl+B or Cmd+B to toggle sidebar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault()
        toggleCollapse()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Close menus on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!target.closest('.workspace-user-menu-wrapper')) {
        setAccountMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  // Developer role preview switcher (ONLY rendered during development)
  const handleDevRoleSwitch = (newRole: UserRole) => {
    if (!import.meta.env.DEV) return
    if (user) {
      setAuthUser({
        ...user,
        role: newRole,
      })
      switch (newRole) {
        case 'admin':
          navigate('/admin')
          break
        case 'teacher':
          navigate('/teacher')
          break
        case 'content':
          navigate('/content')
          break
        case 'support':
          navigate('/support')
          break
        case 'learner':
        default:
          navigate('/dashboard')
          break
      }
    }
  }

  const roleLabel = ROLE_LABELS[user?.role || role]

  return (
    <div className="workspace-shell">
      {/* Sidebar */}
      <WorkspaceSidebar
        config={config}
        collapsed={collapsed}
        onToggleCollapse={toggleCollapse}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />

      {/* Main Viewport */}
      <div className={`workspace-main ${collapsed ? 'sidebar-collapsed' : ''}`}>
        {/* Topbar */}
        <header className="workspace-topbar" aria-label="Thanh công cụ làm việc">
          <div className="workspace-topbar-left">
            <button
              type="button"
              className="workspace-mobile-menu-btn"
              onClick={() => setMobileOpen(true)}
              aria-label="Mở danh mục điều hướng"
            >
              <Menu size={20} />
            </button>
            <div className="workspace-breadcrumb">
              <span className="workspace-name">{config.name}</span>
              {title && <span className="workspace-title-separator">/</span>}
              {title && <span className="workspace-current-title">{title}</span>}
            </div>
          </div>

          <div className="workspace-topbar-right">
            {/* Dev Only Role Preview Switcher */}
            {import.meta.env.DEV && (
              <div className="dev-role-preview-tag" title="Chỉ hiển thị trong môi trường DEV">
                <span className="dev-tag-label">DEV ROLE:</span>
                <select
                  className="dev-role-select"
                  value={user?.role || role}
                  onChange={(e) => handleDevRoleSwitch(e.target.value as UserRole)}
                  aria-label="Chuyển vai trò xem trước trong dev mode"
                >
                  <option value="admin">Admin</option>
                  <option value="teacher">Teacher</option>
                  <option value="content">Content</option>
                  <option value="support">Support</option>
                  <option value="learner">Learner</option>
                </select>
              </div>
            )}

            {/* Role Badge */}
            <div className={`staff-role-pill role-${user?.role || role}`}>
              {roleLabel}
            </div>

            {/* User Account Menu */}
            <div className="workspace-user-menu-wrapper">
              <button
                type="button"
                className="workspace-user-trigger"
                onClick={() => setAccountMenuOpen((prev) => !prev)}
                aria-expanded={accountMenuOpen}
                aria-haspopup="true"
                aria-label="Menu tài khoản cá nhân"
              >
                <div className="workspace-user-avatar">
                  {user?.displayName ? user.displayName.charAt(0).toUpperCase() : 'U'}
                </div>
                <span className="workspace-user-name">
                  {user?.displayName || 'Nhân viên'}
                </span>
                <ChevronDown size={14} className="workspace-user-caret" />
              </button>

              {accountMenuOpen && (
                <div className="workspace-user-dropdown" role="menu">
                  <div className="workspace-dropdown-header">
                    <div className="workspace-dropdown-name">{user?.displayName}</div>
                    <div className="workspace-dropdown-email">{user?.email}</div>
                  </div>
                  <div className="workspace-dropdown-divider" />
                  <Link
                    to="/settings"
                    className="workspace-dropdown-item"
                    role="menuitem"
                    onClick={() => setAccountMenuOpen(false)}
                  >
                    <Settings size={15} />
                    <span>Cài đặt tài khoản</span>
                  </Link>
                  <Link
                    to="/dashboard"
                    className="workspace-dropdown-item"
                    role="menuitem"
                    onClick={() => setAccountMenuOpen(false)}
                  >
                    <UserIcon size={15} />
                    <span>Giao diện học viên</span>
                  </Link>
                  <div className="workspace-dropdown-divider" />
                  <button
                    type="button"
                    className="workspace-dropdown-item logout-item"
                    role="menuitem"
                    onClick={handleLogout}
                  >
                    <LogOut size={15} />
                    <span>Đăng xuất</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Content Container */}
        <main className="workspace-content-container">
          <div className="workspace-content-inner">{children || <Outlet />}</div>
        </main>
      </div>
    </div>
  )
}
