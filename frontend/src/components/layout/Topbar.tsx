import { useEffect, useRef, useState } from 'react'
import {
  Bell,
  BookOpen,
  Bot,
  FileText,
  Layers,
  LogOut,
  Menu,
  Search,
  Settings,
  Shield,
  User as UserIcon,
  X,
} from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/auth/useAuth'
import { Avatar } from '@/components/ui/Avatar'
import { IconButton } from '@/components/ui/IconButton'
import { WorkspaceAppLauncher } from './WorkspaceAppLauncher'


export interface TopbarProps {
  onOpenMobileMenu?: () => void
}

interface SearchResult {
  category: 'Môn học' | 'Bài học' | 'Bài tập' | 'Tài liệu' | 'AI Tutor'
  icon: typeof BookOpen
  title: string
  subtitle: string
  url: string
}

const QUICK_SEARCH_SUGGESTIONS: SearchResult[] = [
  {
    category: 'Bài học',
    icon: BookOpen,
    title: 'Khảo sát sự biến thiên và vẽ đồ thị hàm số',
    subtitle: 'Toán học · Đại số & Giải tích',
    url: '/subjects/math',
  },
  {
    category: 'Bài học',
    icon: BookOpen,
    title: 'Cực trị của hàm số',
    subtitle: 'Toán học · Khảo sát hàm số',
    url: '/subjects/math',
  },
  {
    category: 'Môn học',
    icon: Layers,
    title: 'Chương trình Toán học THPT',
    subtitle: 'Giáo trình chuẩn GDPT 2018',
    url: '/subjects/math',
  },
  {
    category: 'Tài liệu',
    icon: FileText,
    title: 'Sổ tay Công thức Đạo hàm & Bảng biến thiên',
    subtitle: 'Toán học · Tóm tắt lý thuyết',
    url: '/subjects/math',
  },
  {
    category: 'AI Tutor',
    icon: Bot,
    title: 'Hỏi AI về phương pháp giải toán',
    subtitle: 'Hỗ trợ bởi Floating AI Tutor',
    url: '/ai-tutor',
  },
]

interface NotificationItem {
  id: string
  title: string
  subtitle: string
  time: string
  unread: boolean
  url: string
}

export function Topbar({ onOpenMobileMenu }: TopbarProps) {
  const navigate = useNavigate()
  const { user, isAuthenticated, state, logout } = useAuth()
  const searchInputRef = useRef<HTMLInputElement>(null)
  const searchDropdownRef = useRef<HTMLDivElement>(null)
  const notificationsRef = useRef<HTMLDivElement>(null)
  const userMenuRef = useRef<HTMLDivElement>(null)

  const [query, setQuery] = useState('')
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false)
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)

  // Global Ctrl+K / Cmd+K shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        searchInputRef.current?.focus()
        setIsSearchOpen(true)
      } else if (e.key === 'Escape') {
        setIsSearchOpen(false)
        setIsNotificationsOpen(false)
        setIsUserMenuOpen(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        searchDropdownRef.current &&
        !searchDropdownRef.current.contains(e.target as Node) &&
        searchInputRef.current &&
        !searchInputRef.current.contains(e.target as Node)
      ) {
        setIsSearchOpen(false)
      }

      if (
        notificationsRef.current &&
        !notificationsRef.current.contains(e.target as Node)
      ) {
        setIsNotificationsOpen(false)
      }

      if (
        userMenuRef.current &&
        !userMenuRef.current.contains(e.target as Node)
      ) {
        setIsUserMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])


  const filteredResults = query.trim()
    ? QUICK_SEARCH_SUGGESTIONS.filter(
        (item) =>
          item.title.toLowerCase().includes(query.toLowerCase()) ||
          item.subtitle.toLowerCase().includes(query.toLowerCase())
      )
    : QUICK_SEARCH_SUGGESTIONS.slice(0, 4)

  const handleSelectResult = (url: string) => {
    setIsSearchOpen(false)
    setQuery('')
    navigate(url)
  }

  return (
    <header className="topbar">
      {/* Left: Mobile hamburger & search */}
      <div className="topbar-left">
        {onOpenMobileMenu && (
          <button
            type="button"
            className="topbar-mobile-btn mobile-only"
            onClick={onOpenMobileMenu}
            aria-label="Mở danh mục menu"
          >
            <Menu size={20} />
          </button>
        )}

        <div className="topbar-search desktop-only" style={{ position: 'relative' }}>
          <Search size={16} className="topbar-search-icon" aria-hidden />
          <input
            ref={searchInputRef}
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setIsSearchOpen(true)
            }}
            onFocus={() => setIsSearchOpen(true)}
            className="topbar-search-input"
            placeholder="Tìm bài học, khóa học hoặc câu hỏi... (⌘K)"
            aria-label="Tìm kiếm nội dung"
          />
          <kbd className="topbar-search-kbd">⌘K</kbd>

          {/* Search dropdown results */}
          {isSearchOpen && (
            <div
              ref={searchDropdownRef}
              className="topbar-search-dropdown scrollbar-clean"
              style={{
                position: 'absolute',
                top: 'calc(100% + 8px)',
                left: 0,
                right: 0,
                width: '420px',
                background: 'var(--surface-card)',
                border: '1px solid var(--border-default)',
                borderRadius: 'var(--radius-xl)',
                boxShadow: 'var(--shadow-lg)',
                padding: 'var(--space-2)',
                zIndex: 'var(--z-dropdown)',
                maxHeight: '360px',
                overflowY: 'auto',
              }}
              role="listbox"
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '4px 8px',
                  borderBottom: '1px solid var(--border-subtle)',
                  marginBottom: '4px',
                }}
              >
                <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: 600 }}>
                  {query ? 'KẾT QUẢ TÌM KIẾM' : 'GỢI Ý TÌM NHANH'}
                </span>
                <button
                  type="button"
                  onClick={() => setIsSearchOpen(false)}
                  style={{
                    border: 'none',
                    background: 'transparent',
                    color: 'var(--text-tertiary)',
                    cursor: 'pointer',
                  }}
                  aria-label="Đóng tìm kiếm"
                >
                  <X size={14} />
                </button>
              </div>

              {filteredResults.length === 0 ? (
                <div
                  style={{
                    padding: 'var(--space-4)',
                    textAlign: 'center',
                    fontSize: 'var(--text-xs)',
                    color: 'var(--text-tertiary)',
                  }}
                >
                  Không tìm thấy kết quả phù hợp.
                </div>
              ) : (
                filteredResults.map((item, idx) => {
                  const ItemIcon = item.icon
                  return (
                    <button
                      key={idx}
                      type="button"
                      className="search-item-btn"
                      onClick={() => handleSelectResult(item.url)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'var(--space-3)',
                        width: '100%',
                        padding: 'var(--space-2) var(--space-3)',
                        background: 'transparent',
                        border: 'none',
                        borderRadius: 'var(--radius-md)',
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'background-color var(--duration-fast)',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--surface-sunken)')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      <div
                        style={{
                          width: '28px',
                          height: '28px',
                          borderRadius: 'var(--radius-md)',
                          background: 'var(--surface-sunken)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'var(--color-primary)',
                          flexShrink: 0,
                        }}
                      >
                        <ItemIcon size={14} />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', flexGrow: 1, minWidth: 0 }}>
                        <span
                          style={{
                            fontSize: 'var(--text-xs)',
                            fontWeight: 600,
                            color: 'var(--text-primary)',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {item.title}
                        </span>
                        <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
                          {item.subtitle}
                        </span>
                      </div>
                      <span
                        style={{
                          fontSize: '10px',
                          color: 'var(--text-tertiary)',
                          background: 'var(--surface-sunken)',
                          padding: '2px 6px',
                          borderRadius: 'var(--radius-xs)',
                          flexShrink: 0,
                        }}
                      >
                        {item.category}
                      </span>
                    </button>
                  )
                })
              )}
            </div>
          )}
        </div>
      </div>

      {/* Right: Actions */}
      <div className="topbar-right">
        {/* Moodle-style 9-dot Workspace App Launcher */}
        <WorkspaceAppLauncher
          onOpenNotifications={() => setIsNotificationsOpen(true)}
        />

        {/* Notifications */}
        <div className="topbar-notifications-wrap" ref={notificationsRef}>
          <IconButton
            icon={Bell}
            label="Thông báo học tập"
            badgeCount={notifications.filter((n) => n.unread).length || undefined}
            onClick={() => setIsNotificationsOpen((prev) => !prev)}
          />

          {isNotificationsOpen && (
            <div className="topbar-notifications-dropdown" role="region" aria-label="Danh sách thông báo">
              <div className="notifications-header">
                <span className="notifications-title">Thông báo</span>
                {notifications.some((n) => n.unread) && (
                  <button
                    type="button"
                    className="notifications-mark-read"
                    onClick={() => setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })))}
                  >
                    Đã đọc tất cả
                  </button>
                )}
              </div>
              <div className="notifications-list scrollbar-clean">
                {notifications.length === 0 ? (
                  <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 'var(--text-xs)' }}>
                    Không có thông báo mới
                  </div>
                ) : (
                  notifications.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className={`notification-item ${item.unread ? 'is-unread' : ''}`}
                      onClick={() => {
                        setNotifications((prev) =>
                          prev.map((n) => (n.id === item.id ? { ...n, unread: false } : n))
                        )
                        setIsNotificationsOpen(false)
                        navigate(item.url)
                      }}
                    >
                      <div className="notification-dot" aria-hidden />
                      <div className="notification-content">
                        <span className="notification-item-title">{item.title}</span>
                        <p className="notification-item-subtitle">{item.subtitle}</p>
                        <span className="notification-item-time">{item.time}</span>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Authentication & Role-Aware Navigation */}
        {state === 'initializing' ? (
          <div className="topbar-auth-initializing" aria-hidden="true" style={{ width: 80, height: 36 }} />
        ) : isAuthenticated && user ? (
          <div className="topbar-user-wrap" ref={userMenuRef}>
            <button
              type="button"
              className="topbar-user-trigger"
              onClick={() => setIsUserMenuOpen((prev) => !prev)}
              aria-expanded={isUserMenuOpen}
              aria-haspopup="true"
              aria-label="Menu tài khoản"
            >
              <Avatar
                src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80"
                alt={user.displayName}
                size="sm"
              />
              <span className="topbar-user-name desktop-only">{user.displayName}</span>
            </button>

            {isUserMenuOpen && (
              <div
                className="topbar-user-dropdown"
                role="menu"
                aria-label="Tùy chọn người dùng"
              >
                <div className="topbar-user-dropdown-header">
                  <div className="topbar-user-dropdown-name">{user.displayName}</div>
                  <div className="topbar-user-dropdown-sub">
                    {user.email || user.grade || 'Học viên'}
                  </div>
                  <span className="topbar-user-role-badge">
                    {user.role === 'admin'
                      ? 'Quản trị viên'
                      : user.role === 'teacher'
                        ? 'Giáo viên'
                        : user.role === 'content'
                          ? 'Biên tập nội dung'
                          : 'Học viên'}
                  </span>
                </div>

                {/* Role-Specific Workspaces & Dashboards */}
                {user.role === 'admin' && (
                  <Link
                    to="/admin"
                    className="topbar-user-dropdown-item topbar-admin-shortcut"
                    role="menuitem"
                    onClick={() => setIsUserMenuOpen(false)}
                  >
                    <Shield size={15} />
                    <span>Trang quản trị</span>
                  </Link>
                )}

                {user.role === 'teacher' && (
                  <Link
                    to="/teacher"
                    className="topbar-user-dropdown-item"
                    role="menuitem"
                    onClick={() => setIsUserMenuOpen(false)}
                  >
                    <Shield size={15} />
                    <span>Không gian giáo viên</span>
                  </Link>
                )}

                {user.role === 'content' && (
                  <Link
                    to="/content"
                    className="topbar-user-dropdown-item"
                    role="menuitem"
                    onClick={() => setIsUserMenuOpen(false)}
                  >
                    <Shield size={15} />
                    <span>Quản lý nội dung</span>
                  </Link>
                )}

                {user.role === 'learner' && (
                  <Link
                    to="/dashboard"
                    className="topbar-user-dropdown-item"
                    role="menuitem"
                    onClick={() => setIsUserMenuOpen(false)}
                  >
                    <UserIcon size={15} />
                    <span>Bảng điều khiển học tập</span>
                  </Link>
                )}

                <Link
                  to="/profile"
                  className="topbar-user-dropdown-item"
                  role="menuitem"
                  onClick={() => setIsUserMenuOpen(false)}
                >
                  <UserIcon size={15} />
                  <span>Hồ sơ cá nhân</span>
                </Link>

                <Link
                  to="/settings"
                  className="topbar-user-dropdown-item"
                  role="menuitem"
                  onClick={() => setIsUserMenuOpen(false)}
                >
                  <Settings size={15} />
                  <span>Cài đặt</span>
                </Link>

                <div className="topbar-user-dropdown-divider" />

                <button
                  type="button"
                  className="topbar-user-dropdown-item is-danger"
                  role="menuitem"
                  onClick={async () => {
                    setIsUserMenuOpen(false)
                    await logout()
                    navigate('/login')
                  }}
                >
                  <LogOut size={15} />
                  <span>Đăng xuất</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="topbar-auth-guest">
            <Link to="/login" className="topbar-btn-login">
              Đăng nhập
            </Link>
            <Link to="/register" className="topbar-btn-register desktop-only">
              Đăng ký
            </Link>
          </div>
        )}
      </div>
    </header>
  )
}
