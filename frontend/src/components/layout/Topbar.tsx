import { useEffect, useRef, useState } from 'react'
import {
  Bell,
  BookOpen,
  Bot,
  FileText,
  Layers,
  LogOut,
  Menu,
  Moon,
  Search,
  Settings,
  Shield,
  Sun,
  User as UserIcon,
  X,
} from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/auth/useAuth'
import { isPrototypeMode } from '@/config/prototype'
import { Avatar } from '@/components/ui/Avatar'
import { IconButton } from '@/components/ui/IconButton'


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

const MOCK_SEARCH_ITEMS: SearchResult[] = [
  {
    category: 'Bài học',
    icon: BookOpen,
    title: 'Khảo sát sự biến thiên và vẽ đồ thị hàm số',
    subtitle: 'Toán học 12 · Bài 08',
    url: '/subjects/math/lessons/lesson-math-08',
  },
  {
    category: 'Bài học',
    icon: BookOpen,
    title: 'Cực trị của hàm số',
    subtitle: 'Toán học 12 · Bài 02',
    url: '/subjects/math/lessons/lesson-math-02',
  },
  {
    category: 'Môn học',
    icon: Layers,
    title: 'Toán học · Lớp 12',
    subtitle: 'Giáo trình SGK · 32 bài học',
    url: '/subjects/math',
  },
  {
    category: 'Tài liệu',
    icon: FileText,
    title: 'Sổ tay Công thức Đạo hàm & Bảng biến thiên',
    subtitle: 'Thư viện tài liệu 12',
    url: '/library',
  },
  {
    category: 'AI Tutor',
    icon: Bot,
    title: 'Hỏi AI về phương pháp giải tiệm cận đứng',
    subtitle: 'Trợ lý AI giải thích từng bước',
    url: '/ai-tutor?prompt=giai-thich-tiem-can',
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

const INITIAL_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'notif-1',
    title: 'Bài tập duy trì streak 12 ngày',
    subtitle: 'Khảo sát hàm số (Toán 12) cần hoàn thành hôm nay',
    time: '25 phút trước',
    unread: true,
    url: '/exercises',
  },
  {
    id: 'notif-2',
    title: 'Gợi ý mới từ AI Tutor',
    subtitle: 'Bạn nên ôn lại phần Tiệm cận trước khi học bài mới',
    time: '2 giờ trước',
    unread: true,
    url: '/learning-path',
  },
  {
    id: 'notif-3',
    title: 'Thành tích mới mở khóa',
    subtitle: 'Chúc mừng bạn đạt mốc 2,450 XP học tập!',
    time: '1 ngày trước',
    unread: false,
    url: '/achievements',
  },
]

export function Topbar({ onOpenMobileMenu }: TopbarProps) {
  const navigate = useNavigate()
  const { user, isAuthenticated, logout } = useAuth()
  const searchInputRef = useRef<HTMLInputElement>(null)
  const searchDropdownRef = useRef<HTMLDivElement>(null)
  const notificationsRef = useRef<HTMLDivElement>(null)
  const userMenuRef = useRef<HTMLDivElement>(null)

  const [query, setQuery] = useState('')
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [notifications, setNotifications] = useState<NotificationItem[]>(INITIAL_NOTIFICATIONS)
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false)
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)

  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('study_ai_theme') as 'light' | 'dark') || 'light'
  })


  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('study_ai_theme', theme)
  }, [theme])

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


  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'))
  }

  const filteredResults = query.trim()
    ? MOCK_SEARCH_ITEMS.filter(
        (item) =>
          item.title.toLowerCase().includes(query.toLowerCase()) ||
          item.subtitle.toLowerCase().includes(query.toLowerCase())
      )
    : MOCK_SEARCH_ITEMS.slice(0, 4)

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
        {/* Theme toggle */}
        <IconButton
          icon={theme === 'light' ? Moon : Sun}
          label={theme === 'light' ? 'Chuyển sang nền tối' : 'Chuyển sang nền sáng'}
          onClick={toggleTheme}
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
                {notifications.map((item) => (
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
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Quick Admin Access Button & Workspace Switcher */}
        {(() => {
          const canShowAdminShortcut = isPrototypeMode() || user?.role === 'admin'
          if (!canShowAdminShortcut) return null
          return (
            <div className="topbar-admin-shortcut-group">
              <Link
                to="/admin"
                className="topbar-admin-quick-btn"
                aria-label="Trang quản trị"
                title="Trang quản trị hệ thống"
              >
                <Shield size={14} aria-hidden="true" />
                <span className="topbar-admin-quick-label">Trang quản trị</span>
              </Link>
              {isPrototypeMode() && (
                <select
                  className="topbar-workspace-mini-select desktop-only"
                  defaultValue="/admin"
                  onChange={(e) => {
                    navigate(e.target.value)
                  }}
                  aria-label="Chuyển nhanh workspace"
                  title="Chuyển nhanh sang workspace nhân sự"
                >
                  <option value="/admin">Quản trị</option>
                  <option value="/teacher">Giáo viên</option>
                  <option value="/content">Nội dung</option>
                  <option value="/support">Hỗ trợ</option>
                </select>
              )}
            </div>
          )
        })()}

        {/* User state: Authenticated vs Guest */}
        {isAuthenticated && user ? (
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
                  {user.role === 'admin' && (
                    <span className="topbar-user-role-badge">Quản trị viên</span>
                  )}
                </div>

                {(isPrototypeMode() || user.role === 'admin') && (
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

                <Link
                  to="/settings"
                  className="topbar-user-dropdown-item"
                  role="menuitem"
                  onClick={() => setIsUserMenuOpen(false)}
                >
                  <UserIcon size={15} />
                  <span>Tài khoản</span>
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
                    navigate('/dashboard')
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
