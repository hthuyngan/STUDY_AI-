import { useState, useRef, useEffect, useCallback, type KeyboardEvent } from 'react'
import {
  Bell,
  BookOpen,
  Calendar,
  GraduationCap,
  Grid3X3,
  Layers,
  LayoutGrid,
  LogOut,
  Settings,
  Shield,
  User as UserIcon,
  Users,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/auth/useAuth'
import './WorkspaceAppLauncher.css'

export interface WorkspaceAppItem {
  id: string
  label: string
  sublabel?: string
  icon: typeof LayoutGrid
  url: string
  color: string
  bg: string
  roleRequired?: 'admin' | 'teacher' | 'content'
}

export interface WorkspaceAppLauncherProps {
  onOpenNotifications?: () => void
}

export function WorkspaceAppLauncher({ onOpenNotifications }: WorkspaceAppLauncherProps) {
  const { user, isAuthenticated, logout } = useAuth()
  const navigate = useNavigate()
  const [isOpen, setIsOpen] = useState(false)
  const [focusedIndex, setFocusedIndex] = useState<number>(-1)

  const launcherRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const tilesRef = useRef<(HTMLButtonElement | null)[]>([])

  // Core Moodle-style Apps List
  const baseApps: WorkspaceAppItem[] = [
    {
      id: 'dashboard',
      label: 'Tổng quan',
      sublabel: 'Dashboard',
      icon: LayoutGrid,
      url: '/dashboard',
      color: '#2563eb',
      bg: 'rgba(37, 99, 235, 0.08)',
    },
    {
      id: 'subjects',
      label: 'Khóa học',
      sublabel: 'Môn học SGK',
      icon: BookOpen,
      url: '/subjects',
      color: '#059669',
      bg: 'rgba(5, 150, 105, 0.08)',
    },
    {
      id: 'assignments',
      label: 'Lớp học',
      sublabel: 'Bài tập & Điểm số',
      icon: GraduationCap,
      url: '/assignments',
      color: '#7c3aed',
      bg: 'rgba(124, 58, 237, 0.08)',
    },
    {
      id: 'schedule',
      label: 'Lịch học',
      sublabel: 'Thời khóa biểu',
      icon: Calendar,
      url: '/schedule',
      color: '#d97706',
      bg: 'rgba(217, 119, 6, 0.08)',
    },
    {
      id: 'notifications',
      label: 'Thông báo',
      sublabel: 'Lời nhắc',
      icon: Bell,
      url: '#notifications',
      color: '#db2777',
      bg: 'rgba(219, 39, 119, 0.08)',
    },
    {
      id: 'profile',
      label: 'Hồ sơ',
      sublabel: 'Cá nhân & XP',
      icon: UserIcon,
      url: '/profile',
      color: '#0284c7',
      bg: 'rgba(2, 132, 199, 0.08)',
    },
    {
      id: 'settings',
      label: 'Cài đặt',
      sublabel: 'Tùy chọn',
      icon: Settings,
      url: '/settings',
      color: '#475569',
      bg: 'rgba(71, 85, 105, 0.08)',
    },
  ]

  // Role-specific workspaces
  const roleApps: WorkspaceAppItem[] = []

  if (user?.role === 'admin') {
    roleApps.push({
      id: 'admin',
      label: 'Quản trị',
      sublabel: 'Hệ thống',
      icon: Shield,
      url: '/admin',
      color: '#dc2626',
      bg: 'rgba(220, 38, 38, 0.08)',
      roleRequired: 'admin',
    })
  }

  if (user?.role === 'teacher' || user?.role === 'admin') {
    roleApps.push({
      id: 'teacher',
      label: 'Giáo viên',
      sublabel: 'Lớp & Giảng dạy',
      icon: Users,
      url: '/teacher',
      color: '#4f46e5',
      bg: 'rgba(79, 70, 229, 0.08)',
      roleRequired: 'teacher',
    })
  }

  if (user?.role === 'content' || user?.role === 'admin') {
    roleApps.push({
      id: 'content',
      label: 'Nội dung',
      sublabel: 'Biên tập & Kho đề',
      icon: Layers,
      url: '/content',
      color: '#0d9488',
      bg: 'rgba(13, 148, 136, 0.08)',
      roleRequired: 'content',
    })
  }

  const allApps = [...baseApps, ...roleApps]

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (launcherRef.current && !launcherRef.current.contains(event.target as Node)) {
        setIsOpen(false)
        setFocusedIndex(-1)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  // Handle Escape key
  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        setIsOpen(false)
        setFocusedIndex(-1)
        triggerRef.current?.focus()
        return
      }

      if (!isOpen) return

      const totalItems = allApps.length
      const columns = 3

      if (e.key === 'ArrowRight') {
        e.preventDefault()
        setFocusedIndex((prev) => {
          const next = (prev + 1) % totalItems
          tilesRef.current[next]?.focus()
          return next
        })
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        setFocusedIndex((prev) => {
          const next = (prev - 1 + totalItems) % totalItems
          tilesRef.current[next]?.focus()
          return next
        })
      } else if (e.key === 'ArrowDown') {
        e.preventDefault()
        setFocusedIndex((prev) => {
          const next = prev + columns < totalItems ? prev + columns : prev % columns
          tilesRef.current[next]?.focus()
          return next
        })
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setFocusedIndex((prev) => {
          const next = prev - columns >= 0 ? prev - columns : totalItems - (totalItems % columns || columns) + (prev % columns)
          const validNext = next >= totalItems ? next - columns : next
          tilesRef.current[validNext]?.focus()
          return validNext
        })
      }
    },
    [isOpen, allApps.length]
  )

  const handleAppClick = (app: WorkspaceAppItem) => {
    setIsOpen(false)
    setFocusedIndex(-1)
    if (app.id === 'notifications') {
      if (onOpenNotifications) {
        onOpenNotifications()
      } else {
        navigate('/dashboard')
      }
    } else {
      navigate(app.url)
    }
  }

  const handleLogout = async () => {
    setIsOpen(false)
    await logout()
    navigate('/login')
  }

  return (
    <div
      className="workspace-launcher-wrap"
      ref={launcherRef}
      onKeyDown={handleKeyDown}
      data-testid="workspace-app-launcher"
    >
      <button
        ref={triggerRef}
        type="button"
        className={`workspace-launcher-trigger ${isOpen ? 'is-active' : ''}`}
        onClick={() => {
          setIsOpen((prev) => !prev)
          setFocusedIndex(0)
        }}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        aria-label="Không gian làm việc & Ứng dụng (Moodle Workspace)"
        title="Không gian làm việc & Ứng dụng"
      >
        <Grid3X3 size={20} strokeWidth={2.2} />
      </button>

      {isOpen && (
        <div
          className="workspace-launcher-popover"
          role="dialog"
          aria-label="Không gian làm việc & Ứng dụng"
        >
          {/* Header */}
          <div className="workspace-launcher-header">
            <div className="workspace-launcher-title-group">
              <span className="workspace-launcher-title">Không gian học tập</span>
              <span className="workspace-launcher-subtitle">Ứng dụng & Dịch vụ Moodle</span>
            </div>
            {isAuthenticated && user && (
              <span className="workspace-launcher-role-badge">
                {user.role === 'admin'
                  ? 'Quản trị viên'
                  : user.role === 'teacher'
                    ? 'Giáo viên'
                    : user.role === 'content'
                      ? 'Nội dung'
                      : 'Học viên'}
              </span>
            )}
          </div>

          {/* Grid of tiles */}
          <div className="workspace-launcher-grid" role="group" aria-label="Danh sách ứng dụng">
            {allApps.map((app, index) => {
              const Icon = app.icon
              return (
                <button
                  key={app.id}
                  ref={(el) => {
                    tilesRef.current[index] = el
                  }}
                  type="button"
                  className={`workspace-tile ${focusedIndex === index ? 'is-keyboard-focused' : ''}`}
                  onClick={() => handleAppClick(app)}
                  onFocus={() => setFocusedIndex(index)}
                  aria-label={`${app.label}: ${app.sublabel || ''}`}
                  data-testid={`workspace-app-${app.id}`}
                >
                  <div
                    className="workspace-tile-icon-box"
                    style={{ background: app.bg, color: app.color }}
                  >
                    <Icon size={22} strokeWidth={2.1} />
                  </div>
                  <span className="workspace-tile-label">{app.label}</span>
                  {app.sublabel && (
                    <span className="workspace-tile-badge">{app.sublabel}</span>
                  )}
                </button>
              )
            })}
          </div>

          {/* Footer */}
          {isAuthenticated && (
            <div className="workspace-launcher-footer">
              <button
                type="button"
                className="workspace-launcher-footer-link"
                onClick={() => {
                  setIsOpen(false)
                  navigate('/settings')
                }}
              >
                <Settings size={14} />
                <span>Cài đặt hệ thống</span>
              </button>

              <button
                type="button"
                className="workspace-launcher-footer-link workspace-launcher-logout-btn"
                onClick={handleLogout}
              >
                <LogOut size={14} />
                <span>Đăng xuất</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
