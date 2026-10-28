import React, { useEffect, useMemo, useState } from 'react'
import {
  Menu,
  LogOut,
  Settings,
  User as UserIcon,
  ChevronDown,
  ArrowLeft,
} from 'lucide-react'
import { Link, useNavigate, useLocation, Outlet } from 'react-router-dom'
import { useAuth } from '@/auth/useAuth'
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
  const location = useLocation()
  const config = getWorkspaceConfig(role)

  const [collapsed, setCollapsed] = useState<boolean>(() => {
    return localStorage.getItem('study_ai_workspace_sidebar_collapsed') === 'true'
  })
  const [mobileOpen, setMobileOpen] = useState<boolean>(false)
  const [prevPath, setPrevPath] = useState(location.pathname)
  const [accountMenuOpen, setAccountMenuOpen] = useState<boolean>(false)

  // Auto-close mobile drawer and dropdown on route change without cascading effects
  if (location.pathname !== prevPath) {
    setPrevPath(location.pathname)
    setMobileOpen(false)
    setAccountMenuOpen(false)
  }

  const toggleCollapse = () => {
    setCollapsed((prev) => {
      const next = !prev
      localStorage.setItem('study_ai_workspace_sidebar_collapsed', String(next))
      return next
    })
  }

  // Keyboard shortcut Ctrl+B or Cmd+B to toggle sidebar, Escape to close menus
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault()
        toggleCollapse()
      } else if (e.key === 'Escape') {
        setMobileOpen(false)
        setAccountMenuOpen(false)
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

  const roleLabel = ROLE_LABELS[user?.role || role]

  // Compute active navigation title for breadcrumbs if not explicitly passed
  const currentNavTitle = useMemo(() => {
    if (title) return title
    const currentPath = location.pathname.replace(/\/$/, '') || '/'
    const basePath = config.basePath.replace(/\/$/, '') || '/'

    for (const group of config.groups) {
      for (const item of group.items) {
        const itemPath = item.path.replace(/\/$/, '') || '/'
        if (currentPath === itemPath) {
          return item.label
        }
        if (itemPath !== basePath && currentPath.startsWith(itemPath + '/')) {
          return item.label
        }
      }
    }
    return undefined
  }, [title, location.pathname, config])

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
              {currentNavTitle && <span className="workspace-title-separator">/</span>}
              {currentNavTitle && <span className="workspace-current-title">{currentNavTitle}</span>}
            </div>
          </div>

          <div className="workspace-topbar-right">
            {/* Quick Action: Quay lại giao diện học viên */}
            <Link
              to="/dashboard"
              className="workspace-back-to-app-btn"
              aria-label="Quay lại giao diện học viên"
              title="Quay lại giao diện học viên (/dashboard)"
            >
              <ArrowLeft size={14} aria-hidden="true" />
              <span>Giao diện học viên</span>
            </Link>

            {/* Quick Workspace Switcher for Prototype Mode */}
            <div className="workspace-switcher-wrapper">
              <select
                className="workspace-switcher-select"
                value={role}
                onChange={(e) => {
                  const target = e.target.value
                  switch (target) {
                    case 'learner':
                      navigate('/dashboard')
                      break
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
                  }
                }}
                aria-label="Chuyển không gian làm việc"
                title="Chuyển đổi giữa các workspace"
              >
                <option value="admin">Quản trị (Admin)</option>
                <option value="teacher">Giáo viên (Teacher)</option>
                <option value="content">Nội dung (Content)</option>
                <option value="support">Hỗ trợ (Support)</option>
                <option value="learner">Học viên (Learner)</option>
              </select>
            </div>

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
