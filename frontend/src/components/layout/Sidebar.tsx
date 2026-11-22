import {
  GraduationCap,
  Layers,
  LayoutGrid,
  Target,
  Trophy,
  X,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { SidebarItem } from './SidebarItem'

export interface SidebarProps {
  mobileOpen?: boolean
  onCloseMobile?: () => void
}

export function Sidebar({
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
        className={`sidebar ${mobileOpen ? 'mobile-open' : ''}`.trim()}
        aria-label="Thanh điều hướng chính"
      >
        {/* Header / Brand */}
        <div className="sidebar-header">
          <Link to="/dashboard" className="sidebar-brand" onClick={onCloseMobile}>
            <div className="sidebar-brand-icon" aria-hidden>
              <GraduationCap size={20} />
            </div>
            <div className="sidebar-brand-text">
              <span className="brand-name">STUDY AI</span>
              <span className="brand-badge">PRO</span>
            </div>
          </Link>

          {/* Mobile Close Button */}
          {mobileOpen && onCloseMobile && (
            <button
              type="button"
              className="sidebar-mobile-close-btn"
              onClick={onCloseMobile}
              aria-label="Đóng thanh điều hướng"
            >
              <X size={18} />
            </button>
          )}
        </div>

        {/* Navigation list */}
        <nav className="sidebar-nav scrollbar-clean">
          {/* Group 1: MENU CHÍNH */}
          <div className="sidebar-nav-group">
            <div className="sidebar-group-header">
              <span className="sidebar-group-title">MENU CHÍNH</span>
            </div>
            <SidebarItem
              to="/dashboard"
              label="Tổng quan"
              icon={LayoutGrid}
              onClick={onCloseMobile}
            />
            <SidebarItem
              to="/subjects"
              label="Môn học"
              icon={Layers}
              onClick={onCloseMobile}
            />
            <SidebarItem
              to="/assignments"
              label="Lớp học"
              icon={GraduationCap}
              onClick={onCloseMobile}
            />
          </div>

          {/* Group 2: LUYỆN TẬP */}
          <div className="sidebar-nav-group">
            <div className="sidebar-group-header">
              <span className="sidebar-group-title">LUYỆN TẬP</span>
            </div>
            <SidebarItem
              to="/exam-preparation"
              label="Luyện thi"
              icon={Trophy}
              onClick={onCloseMobile}
            />
            <SidebarItem
              to="/practice"
              label="Bài tập"
              icon={Target}
              onClick={onCloseMobile}
            />
          </div>
        </nav>
      </aside>
    </>
  )
}
