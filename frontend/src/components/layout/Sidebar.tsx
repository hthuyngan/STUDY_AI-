import {
  BookOpen,
  Bot,
  Calendar,
  ClipboardCheck,
  CreditCard,
  FileText,
  GraduationCap,
  HelpCircle,
  LayoutGrid,
  Target,
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
              <span className="brand-name">AI TUTOR</span>
              <span className="brand-badge">TOÁN 12</span>
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

        {/* Navigation list — empty bottom per specification */}
        <nav className="sidebar-nav scrollbar-clean">
          {/* Group 1: HỌC TẬP */}
          <div className="sidebar-nav-group">
            <div className="sidebar-group-header">
              <span className="sidebar-group-title">HỌC TẬP</span>
            </div>
            <SidebarItem
              to="/dashboard"
              label="Tổng quan"
              icon={LayoutGrid}
              onClick={onCloseMobile}
            />
            <SidebarItem
              to="/ai-tutor"
              label="AI Gia sư"
              icon={Bot}
              onClick={onCloseMobile}
            />
            <SidebarItem
              to="/subjects/math"
              label="Kiến thức Toán 12"
              icon={BookOpen}
              onClick={onCloseMobile}
            />
            <SidebarItem
              to="/practice"
              label="Luyện tập"
              icon={Target}
              onClick={onCloseMobile}
            />
            <SidebarItem
              to="/exam-preparation"
              label="Kiểm tra & thi thử"
              icon={ClipboardCheck}
              onClick={onCloseMobile}
            />
            <SidebarItem
              to="/my-notes"
              label="Sổ tay học tập"
              icon={FileText}
              onClick={onCloseMobile}
            />
          </div>

          {/* Group 2: TIỆN ÍCH */}
          <div className="sidebar-nav-group">
            <div className="sidebar-group-header">
              <span className="sidebar-group-title">TIỆN ÍCH</span>
            </div>
            <SidebarItem
              to="/assignments"
              label="Lớp học của tôi"
              icon={GraduationCap}
              onClick={onCloseMobile}
            />
            <SidebarItem
              to="/schedule"
              label="Kế hoạch học tập"
              icon={Calendar}
              onClick={onCloseMobile}
            />
            <SidebarItem
              to="/subscriptions"
              label="Gói đăng ký"
              icon={CreditCard}
              onClick={onCloseMobile}
            />
            <SidebarItem
              to="/support"
              label="Hỗ trợ"
              icon={HelpCircle}
              onClick={onCloseMobile}
            />
          </div>
        </nav>
      </aside>
    </>
  )
}
