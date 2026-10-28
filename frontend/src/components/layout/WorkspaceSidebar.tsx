import React, { useState, useMemo } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  GraduationCap,
  ArrowLeft,
  Search,
  X,
  ExternalLink,
} from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import type { WorkspaceConfig } from './workspaceNavigation'

export interface WorkspaceSidebarProps {
  config: WorkspaceConfig
  collapsed?: boolean
  onToggleCollapse?: () => void
  mobileOpen?: boolean
  onCloseMobile?: () => void
}

export const WorkspaceSidebar: React.FC<WorkspaceSidebarProps> = ({
  config,
  collapsed = false,
  onToggleCollapse,
  mobileOpen = false,
  onCloseMobile,
}) => {
  const location = useLocation()
  const [searchQuery, setSearchQuery] = useState('')
  const [hoveredItemId, setHoveredItemId] = useState<string | null>(null)

  // Normalize paths for reliable active state matching
  const currentPath = location.pathname.replace(/\/$/, '') || '/'
  const basePath = config.basePath.replace(/\/$/, '') || '/'

  // Filter navigation items by quick search
  const filteredGroups = useMemo(() => {
    if (!searchQuery.trim()) return config.groups
    const q = searchQuery.toLowerCase().trim()
    return config.groups
      .map((g) => ({
        ...g,
        items: g.items.filter((item) => item.label.toLowerCase().includes(q)),
      }))
      .filter((g) => g.items.length > 0)
  }, [config.groups, searchQuery])

  return (
    <>
      {mobileOpen && (
        <div
          className="sidebar-mobile-backdrop"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      <aside
        className={`sidebar workspace-sidebar ${collapsed ? 'collapsed' : 'expanded'} ${mobileOpen ? 'mobile-open' : ''}`.trim()}
        aria-label={`Thanh điều hướng ${config.name}`}
      >
        {/* =====================================================================
            1. BRAND & CONSOLE HEADER (60-64px)
            ===================================================================== */}
        <div className="sidebar-header">
          <Link
            to={config.basePath}
            className="sidebar-brand"
            onClick={onCloseMobile}
            title={`${config.name} - STUDY_AI`}
          >
            {/* Brand Seal Icon (Navy Notebook #102A43) */}
            <div className="sidebar-brand-icon" aria-hidden="true">
              <GraduationCap size={20} />
            </div>

            {!collapsed && (
              <div className="sidebar-brand-text">
                <div className="brand-title-row">
                  <span className="brand-name">STUDY AI</span>
                  <span className="brand-role-badge">{config.subLabel}</span>
                </div>
              </div>
            )}
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

        {/* =====================================================================
            2. QUICK NAVIGATION SEARCH (Expanded only)
            ===================================================================== */}
        {!collapsed && (
          <div className="sidebar-search-box">
            <div className="sidebar-search-inner">
              <Search size={13} className="sidebar-search-icon" aria-hidden="true" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm nhanh menu..."
                aria-label="Tìm nhanh mục chức năng"
                className="sidebar-search-input"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="sidebar-search-clear"
                  aria-label="Xóa tìm kiếm"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        )}

        {/* =====================================================================
            3. GROUPED NAVIGATION LIST
            ===================================================================== */}
        <nav className="sidebar-nav scrollbar-clean" aria-label="Menu quản trị">
          {filteredGroups.length === 0 ? (
            <div className="sidebar-search-empty">
              Không tìm thấy mục nào
            </div>
          ) : (
            filteredGroups.map((group) => (
              <div key={group.id} className="sidebar-nav-group">
                {!collapsed && (
                  <div className="sidebar-group-header">
                    <span className="sidebar-group-title">{group.title}</span>
                  </div>
                )}
                <div className="sidebar-sub-items">
                  {group.items.map((item) => {
                    const Icon = item.icon
                    const itemPath = item.path.replace(/\/$/, '') || '/'
                    const isActive =
                      currentPath === itemPath ||
                      (itemPath !== basePath && (currentPath === itemPath || currentPath.startsWith(itemPath + '/')))

                    return (
                      <div
                        key={item.id}
                        className="sidebar-item-wrapper"
                        onMouseEnter={() => setHoveredItemId(item.id)}
                        onMouseLeave={() => setHoveredItemId(null)}
                      >
                        <Link
                          to={item.path}
                          className={`sidebar-nav-link ${isActive ? 'active' : ''} ${collapsed ? 'collapsed' : ''}`.trim()}
                          onClick={onCloseMobile}
                          aria-current={isActive ? 'page' : undefined}
                          title={collapsed ? item.label : undefined}
                        >
                          <div className="sidebar-item-left">
                            <Icon className="sidebar-nav-icon" size={17} aria-hidden="true" />
                            {!collapsed && (
                              <span className="sidebar-nav-label">{item.label}</span>
                            )}
                          </div>

                          {!collapsed && item.badge !== undefined && (
                            <span className="sidebar-nav-count" aria-hidden="true">{item.badge}</span>
                          )}

                          {collapsed && item.badge !== undefined && (
                            <span className="sidebar-nav-dot" aria-hidden="true" />
                          )}
                        </Link>

                        {/* Tooltip for Collapsed Sidebar */}
                        {collapsed && hoveredItemId === item.id && (
                          <div className="sidebar-collapsed-tooltip">
                            <span>{item.label}</span>
                            {item.badge !== undefined && (
                              <span className="tooltip-badge">{item.badge}</span>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            ))
          )}
        </nav>

        {/* =====================================================================
            4. FOOTER: WORKSPACE SWITCHER, BACK TO LEARNER & COLLAPSE TOGGLE
            ===================================================================== */}
        <div className="workspace-sidebar-footer">
          {/* Quick Workspace Switcher (Expanded only) */}
          {!collapsed && (
            <div className="sidebar-workspace-switcher">
              <span className="switcher-label">Chuyển không gian:</span>
              <div className="switcher-grid">
                {[
                  { role: 'admin', label: 'Admin', path: '/admin' },
                  { role: 'teacher', label: 'Teacher', path: '/teacher' },
                  { role: 'content', label: 'Content', path: '/content' },
                  { role: 'support', label: 'Support', path: '/support' },
                ].map((ws) => {
                  const isCurrent = config.role === ws.role
                  return (
                    <Link
                      key={ws.role}
                      to={ws.path}
                      onClick={onCloseMobile}
                      className={`switcher-btn ${isCurrent ? 'active' : ''}`}
                      title={`Chuyển sang ${ws.label} Workspace`}
                    >
                      {ws.label}
                    </Link>
                  )
                })}
              </div>
            </div>
          )}

          {/* Return to Learner Portal */}
          <Link
            to="/dashboard"
            className="workspace-sidebar-back-link"
            onClick={onCloseMobile}
            title={collapsed ? 'Quay lại học viên' : undefined}
          >
            <div className="back-link-left">
              <ArrowLeft size={15} aria-hidden="true" />
              {!collapsed && <span>Quay lại học viên</span>}
            </div>
            {!collapsed && <ExternalLink size={12} className="back-link-ext" aria-hidden="true" />}
          </Link>

          {/* Collapse Toggle */}
          {onToggleCollapse && (
            <button
              type="button"
              className="sidebar-collapse-btn desktop-only"
              onClick={onToggleCollapse}
              aria-label={collapsed ? 'Mở rộng thanh điều hướng' : 'Thu gọn thanh điều hướng'}
              title={collapsed ? 'Mở rộng (Ctrl+B)' : 'Thu gọn (Ctrl+B)'}
            >
              {!collapsed && <span>Thu gọn</span>}
              {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
            </button>
          )}
        </div>
      </aside>
    </>
  )
}
