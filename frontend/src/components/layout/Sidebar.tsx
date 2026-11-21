import {
  ChevronLeft,
  ChevronRight,
  GraduationCap,
  Layers,
  LayoutGrid,
  LogIn,
  Target,
  Trophy,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/auth/useAuth'
import { Avatar } from '@/components/ui/Avatar'
import { SidebarItem } from './SidebarItem'

export interface SidebarProps {
  collapsed?: boolean
  onToggleCollapse?: () => void
  mobileOpen?: boolean
  onCloseMobile?: () => void
}

export function Sidebar({
  collapsed = false,
  onToggleCollapse,
  mobileOpen = false,
  onCloseMobile,
}: SidebarProps) {
  const { user, isAuthenticated } = useAuth()

  return (
    <>
      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="sidebar-mobile-backdrop"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      <aside
        className={`sidebar ${collapsed ? 'collapsed' : ''} ${mobileOpen ? 'mobile-open' : ''}`.trim()}
        aria-label="Thanh điều hướng chính"
      >
        {/* Header / Brand */}
        <div className="sidebar-header">
          <Link to="/dashboard" className="sidebar-brand" onClick={onCloseMobile}>
            <div className="sidebar-brand-icon" aria-hidden>
              <GraduationCap size={20} />
            </div>
            {!collapsed && (
              <div className="sidebar-brand-text">
                <span className="brand-name">STUDY AI</span>
                <span className="brand-badge">PRO</span>
              </div>
            )}
          </Link>

          {onToggleCollapse && (
            <button
              type="button"
              className="sidebar-collapse-btn desktop-only"
              onClick={onToggleCollapse}
              aria-label={collapsed ? 'Mở rộng thanh điều hướng' : 'Thu gọn thanh điều hướng'}
              title={collapsed ? 'Mở rộng (⌘B)' : 'Thu gọn (⌘B)'}
            >
              {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
            </button>
          )}
        </div>

        {/* Navigation list */}
        <nav className="sidebar-nav scrollbar-clean">
          {/* Group 1: MENU CHÍNH */}
          <div className="sidebar-nav-group">
            {!collapsed ? (
              <div className="sidebar-group-header">
                <span className="sidebar-group-title">MENU CHÍNH</span>
              </div>
            ) : (
              <div className="sidebar-group-divider" aria-hidden />
            )}
            <SidebarItem
              to="/dashboard"
              label="Tổng quan"
              icon={LayoutGrid}
              collapsed={collapsed}
              onClick={onCloseMobile}
            />
            <SidebarItem
              to="/subjects"
              label="Môn học"
              icon={Layers}
              collapsed={collapsed}
              onClick={onCloseMobile}
            />
            <SidebarItem
              to="/assignments"
              label="Lớp học"
              icon={GraduationCap}
              collapsed={collapsed}
              onClick={onCloseMobile}
            />
          </div>

          {/* Group 2: LUYỆN TẬP */}
          <div className="sidebar-nav-group">
            {!collapsed ? (
              <div className="sidebar-group-header">
                <span className="sidebar-group-title">LUYỆN TẬP</span>
              </div>
            ) : (
              <div className="sidebar-group-divider" aria-hidden />
            )}
            <SidebarItem
              to="/exam-preparation"
              label="Luyện thi"
              icon={Trophy}
              collapsed={collapsed}
              onClick={onCloseMobile}
            />
            <SidebarItem
              to="/practice"
              label="Bài tập"
              icon={Target}
              collapsed={collapsed}
              onClick={onCloseMobile}
            />
          </div>
        </nav>

        {/* Footer: User profile */}
        <div className="sidebar-footer">
          {isAuthenticated && user ? (
            <Link to="/profile" className="sidebar-user-card" onClick={onCloseMobile} title="Xem hồ sơ cá nhân">
              <Avatar
                src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80"
                alt={user.displayName}
                size={collapsed ? 'sm' : 'md'}
              />
              {!collapsed && (
                <div className="sidebar-user-info">
                  <span className="sidebar-user-name">{user.displayName}</span>
                  <span className="sidebar-user-grade">
                    {user.grade || (user.role === 'admin' ? 'Quản trị viên' : user.role === 'teacher' ? 'Giáo viên' : 'Học viên')}
                  </span>
                </div>
              )}
            </Link>
          ) : (
            <Link to="/login" className="sidebar-user-card" onClick={onCloseMobile} title="Đăng nhập để đồng bộ tiến độ">
              <div className="sidebar-user-avatar-guest" aria-hidden="true">
                <LogIn size={collapsed ? 18 : 20} />
              </div>
              {!collapsed && (
                <div className="sidebar-user-info">
                  <span className="sidebar-user-name">Khách</span>
                  <span className="sidebar-user-grade">Đăng nhập tài khoản</span>
                </div>
              )}
            </Link>
          )}
        </div>
      </aside>
    </>
  )
}
