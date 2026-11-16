import {
  Atom,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Compass,
  FlaskConical,
  GraduationCap,
  Languages,
  Layers,
  LayoutGrid,
  LogIn,
  Palette,
  Settings,
  Target,
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
          <div className="sidebar-nav-group">
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
              to="/practice"
              label="Luyện tập & Ôn câu sai"
              icon={Target}
              collapsed={collapsed}
              onClick={onCloseMobile}
            />
            <SidebarItem
              to="/practice?mode=exam"
              label="Thi thử"
              icon={ClipboardList}
              collapsed={collapsed}
              onClick={onCloseMobile}
            />
            <SidebarItem
              to="/assignments"
              label="Lớp học & Bài tập"
              icon={GraduationCap}
              collapsed={collapsed}
              onClick={onCloseMobile}
            />
          </div>

          {/* Group 2: PHÂN MÔN */}
          <div className="sidebar-nav-group">
            {!collapsed ? (
              <div className="sidebar-group-header">
                <span className="sidebar-group-title">PHÂN MÔN</span>
              </div>
            ) : (
              <div className="sidebar-group-divider" aria-hidden />
            )}

            <div className="sidebar-sub-items">
              <SidebarItem
                to="/subjects/math"
                label="Toán học"
                icon={Compass}
                collapsed={collapsed}
                onClick={onCloseMobile}
              />
              <SidebarItem
                to="/subjects/physics"
                label="Vật lý"
                icon={Atom}
                collapsed={collapsed}
                onClick={onCloseMobile}
              />
              <SidebarItem
                to="/subjects/chemistry"
                label="Hóa học"
                icon={FlaskConical}
                collapsed={collapsed}
                onClick={onCloseMobile}
              />
              <SidebarItem
                to="/subjects/english"
                label="Tiếng Anh"
                icon={Languages}
                collapsed={collapsed}
                onClick={onCloseMobile}
              />
            </div>
          </div>

          {/* Group 3: KHÔNG GIAN LÀM VIỆC (Cho Giáo viên / Quản trị viên / Biên tập) */}
          {user && (user.role === 'teacher' || user.role === 'content' || user.role === 'admin') && (
            <div className="sidebar-nav-group">
              {!collapsed ? (
                <div className="sidebar-group-header">
                  <span className="sidebar-group-title">QUẢN LÝ</span>
                </div>
              ) : (
                <div className="sidebar-group-divider" aria-hidden />
              )}
              {user.role === 'teacher' && (
                <SidebarItem
                  to="/teacher"
                  label="Không gian giáo viên"
                  icon={GraduationCap}
                  collapsed={collapsed}
                  onClick={onCloseMobile}
                />
              )}
              {user.role === 'content' && (
                <SidebarItem
                  to="/content"
                  label="Quản lý nội dung"
                  icon={Layers}
                  collapsed={collapsed}
                  onClick={onCloseMobile}
                />
              )}
              {user.role === 'admin' && (
                <SidebarItem
                  to="/admin"
                  label="Quản trị hệ thống"
                  icon={Settings}
                  collapsed={collapsed}
                  onClick={onCloseMobile}
                />
              )}
            </div>
          )}

          {/* Group 4: THIẾT LẬP */}
          <div className="sidebar-nav-group">
            {!collapsed ? (
              <div className="sidebar-group-header">
                <span className="sidebar-group-title">CÀI ĐẶT</span>
              </div>
            ) : (
              <div className="sidebar-group-divider" aria-hidden />
            )}

            {import.meta.env.DEV && (
              <SidebarItem
                to="/design-system"
                label="Design System"
                icon={Palette}
                collapsed={collapsed}
                onClick={onCloseMobile}
              />
            )}
            <SidebarItem
              to="/settings"
              label="Cài đặt"
              icon={Settings}
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
