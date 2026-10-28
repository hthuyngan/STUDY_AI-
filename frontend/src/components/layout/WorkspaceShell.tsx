import React, { useEffect, useState, useRef } from 'react'
import {
  Menu,
  LogOut,
  Settings,
  User as UserIcon,
  ChevronDown,
  ArrowLeft,
  PanelLeftClose,
  PanelLeftOpen,
  Info,
  Bell,
  Search,
  CheckCheck,
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
  const [notifyOpen, setNotifyOpen] = useState<boolean>(false)

  const accountMenuRef = useRef<HTMLDivElement>(null)
  const notifyRef = useRef<HTMLDivElement>(null)

  // Auto-close mobile drawer and dropdown on route change without cascading effects
  if (location.pathname !== prevPath) {
    setPrevPath(location.pathname)
    setMobileOpen(false)
    setAccountMenuOpen(false)
    setNotifyOpen(false)
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
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        const searchInput = document.querySelector('.sidebar-search-input') as HTMLInputElement
        if (searchInput) searchInput.focus()
      } else if (e.key === 'Escape') {
        setMobileOpen(false)
        setAccountMenuOpen(false)
        setNotifyOpen(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Close menus on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (accountMenuRef.current && !accountMenuRef.current.contains(target)) {
        setAccountMenuOpen(false)
      }
      if (notifyRef.current && !notifyRef.current.contains(target)) {
        setNotifyOpen(false)
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

  // Compute active navigation item and group for structured breadcrumbs
  let currentNavTitle = title
  let currentGroupTitle: string | undefined

  const currentPath = location.pathname.replace(/\/$/, '') || '/'
  const basePath = config.basePath.replace(/\/$/, '') || '/'

  for (const group of config.groups) {
    for (const item of group.items) {
      const itemPath = item.path.replace(/\/$/, '') || '/'
      if (currentPath === itemPath) {
        if (!currentNavTitle) currentNavTitle = item.label
        currentGroupTitle = group.title
        break
      }
      if (itemPath !== basePath && currentPath.startsWith(itemPath + '/')) {
        if (!currentNavTitle) currentNavTitle = item.label
        currentGroupTitle = group.title
        break
      }
    }
    if (currentGroupTitle) break
  }

  return (
    <div className="workspace-shell">
      {/* Shared Management Sidebar */}
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
            {/* Mobile Hamburger Trigger (< 1024px) */}
            <button
              type="button"
              className="workspace-mobile-menu-btn"
              onClick={() => setMobileOpen(true)}
              aria-label="Mở danh mục điều hướng"
            >
              <Menu size={20} />
            </button>

            {/* Desktop Collapse Icon Trigger (>= 1024px) */}
            <button
              type="button"
              className="workspace-desktop-collapse-btn desktop-only"
              onClick={toggleCollapse}
              aria-label={collapsed ? 'Mở rộng sidebar' : 'Thu gọn sidebar'}
              title={collapsed ? 'Mở rộng sidebar (Ctrl+B)' : 'Thu gọn sidebar (Ctrl+B)'}
            >
              {collapsed ? <PanelLeftOpen size={17} /> : <PanelLeftClose size={17} />}
            </button>

            {/* Structured Breadcrumbs */}
            <div className="workspace-breadcrumb">
              <span className="workspace-name">{config.name}</span>
              {currentGroupTitle && (
                <>
                  <span className="workspace-title-separator">/</span>
                  <span className="workspace-group-crumb">{currentGroupTitle}</span>
                </>
              )}
              {currentNavTitle && (
                <>
                  <span className="workspace-title-separator">/</span>
                  <span className="workspace-current-title">{currentNavTitle}</span>
                </>
              )}
            </div>
          </div>

          <div className="workspace-topbar-right">
            {/* Environment / Prototype Indicator Pill */}
            <div
              className="workspace-prototype-pill"
              title="Chế độ mô phỏng vận hành trực tiếp không yêu cầu đăng nhập"
            >
              <Info size={12} aria-hidden="true" />
              <span>FE Prototype</span>
            </div>

            {/* Quick Search Trigger (focuses search input in sidebar) */}
            <button
              type="button"
              className="workspace-search-trigger-btn"
              onClick={() => {
                const searchInput = document.querySelector('.sidebar-search-input') as HTMLInputElement
                if (searchInput) searchInput.focus()
              }}
              title="Tìm nhanh trong thanh điều hướng (Ctrl+K)"
            >
              <Search size={13} aria-hidden="true" />
              <span>Tìm nhanh...</span>
              <kbd className="search-kbd">⌘K</kbd>
            </button>

            {/* Notifications Popover */}
            <div className="workspace-notify-wrapper" ref={notifyRef}>
              <button
                type="button"
                className="workspace-notify-btn"
                onClick={() => setNotifyOpen((prev) => !prev)}
                aria-label="Thông báo hệ thống (3 mới)"
                title="Thông báo hệ thống"
              >
                <Bell size={16} />
                <span className="notify-badge">3</span>
              </button>

              {notifyOpen && (
                <div className="workspace-notify-dropdown" role="dialog" aria-label="Thông báo">
                  <div className="notify-header">
                    <div className="notify-title-group">
                      <span className="notify-heading">Thông báo hệ thống</span>
                      <span className="notify-count-pill">3 mới</span>
                    </div>
                    <button
                      type="button"
                      className="notify-mark-read"
                      onClick={() => setNotifyOpen(false)}
                    >
                      <CheckCheck size={13} />
                      <span>Đã đọc hết</span>
                    </button>
                  </div>

                  <div className="notify-list scrollbar-clean">
                    <div className="notify-item unread">
                      <div className="notify-item-title">
                        {role === 'content'
                          ? '2 Học liệu bài giảng mới chờ phê duyệt'
                          : role === 'teacher'
                            ? '5 Bài tập học sinh nộp cần chấm điểm'
                            : role === 'support'
                              ? '3 Vé hỗ trợ vượt thời hạn phản hồi SLA'
                              : '14 Mục vận hành đang chờ xử lý'}
                      </div>
                      <div className="notify-item-meta">10 phút trước • Hệ thống STUDY_AI</div>
                    </div>
                    <div className="notify-item">
                      <div className="notify-item-title">Đồng bộ dữ liệu tiến độ hoàn tất</div>
                      <div className="notify-item-meta">45 phút trước • Bản lưu tự động</div>
                    </div>
                    <div className="notify-item">
                      <div className="notify-item-title">Hạ tầng hệ thống đạt trạng thái 100% On-track</div>
                      <div className="notify-item-meta">2 giờ trước • Giám sát hiệu năng</div>
                    </div>
                  </div>
                </div>
              )}
            </div>

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
            <div className="workspace-user-menu-wrapper" ref={accountMenuRef}>
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
                    <div className="workspace-dropdown-name">{user?.displayName || 'Nhân viên STUDY_AI'}</div>
                    <div className="workspace-dropdown-email">{user?.email || 'staff@study-ai.edu.vn'}</div>
                    <div className="workspace-dropdown-role-tag">
                      VAI TRÒ: {roleLabel.toUpperCase()}
                    </div>
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

        {/* Content Container (Standardized Max Width 1680px) */}
        <main className="workspace-content-container">
          <div className="workspace-content-inner">{children || <Outlet />}</div>
        </main>
      </div>
    </div>
  )
}
