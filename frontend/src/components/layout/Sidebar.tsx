import {
  Atom,
  Award,
  BookOpen,
  Bot,
  ChevronLeft,
  ChevronRight,
  Compass,
  FileText,
  FlaskConical,
  GraduationCap,
  Languages,
  Layers,
  LayoutGrid,
  Library,
  Milestone,
  Palette,
  Settings,
} from 'lucide-react'
import { Link } from 'react-router-dom'
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
              to="/learning-path"
              label="Lộ trình học"
              icon={Milestone}
              collapsed={collapsed}
              onClick={onCloseMobile}
            />
            <SidebarItem
              to="/ai-tutor"
              label="AI Tutor"
              icon={Bot}
              collapsed={collapsed}
              onClick={onCloseMobile}
            />
            <SidebarItem
              to="/courses"
              label="Khóa học"
              icon={BookOpen}
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
              to="/exercises"
              label="Bài tập"
              icon={FileText}
              count={3}
              collapsed={collapsed}
              onClick={onCloseMobile}
            />
            <SidebarItem
              to="/library"
              label="Thư viện"
              icon={Library}
              collapsed={collapsed}
              onClick={onCloseMobile}
            />
          </div>

          {/* Group 2: HỌC TẬP */}
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

          {/* Group 3: KHÁC */}
          <div className="sidebar-nav-group">
            {!collapsed ? (
              <div className="sidebar-group-header">
                <span className="sidebar-group-title">KHÁC</span>
              </div>
            ) : (
              <div className="sidebar-group-divider" aria-hidden />
            )}

            <SidebarItem
              to="/achievements"
              label="Thành tích"
              icon={Award}
              collapsed={collapsed}
              onClick={onCloseMobile}
            />
            <SidebarItem
              to="/design-system"
              label="Design System"
              icon={Palette}
              collapsed={collapsed}
              onClick={onCloseMobile}
            />
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
          <Link to="/profile" className="sidebar-user-card" onClick={onCloseMobile}>
            <Avatar
              src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80"
              alt="Hoàng Thúy Ngân"
              size={collapsed ? 'sm' : 'md'}
            />
            {!collapsed && (
              <div className="sidebar-user-info">
                <span className="sidebar-user-name">Hoàng Thúy Ngân</span>
                <span className="sidebar-user-grade">Lớp 12A1 · Tự nhiên</span>
              </div>
            )}
          </Link>
        </div>
      </aside>
    </>
  )
}
