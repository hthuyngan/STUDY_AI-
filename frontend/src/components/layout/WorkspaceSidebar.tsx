import React, { useState, useMemo } from 'react'
import {
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
  mobileOpen = false,
  onCloseMobile,
}) => {
  const location = useLocation()
  const [searchQuery, setSearchQuery] = useState('')

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
        className={`sidebar workspace-sidebar expanded ${mobileOpen ? 'mobile-open' : ''}`.trim()}
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

            <div className="sidebar-brand-text">
              <div className="brand-title-row">
                <span className="brand-name">STUDY AI</span>
                <span className="brand-role-badge">{config.subLabel}</span>
              </div>
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

        {/* =====================================================================
            2. QUICK NAVIGATION SEARCH (Expanded)
            ===================================================================== */}
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
                aria-label="Xóa nội dung tìm kiếm"
              >
                <X size={12} />
              </button>
            )}
          </div>
        </div>

        {/* =====================================================================
            3. GROUPED NAVIGATION ITEMS (Scrollable)
            ===================================================================== */}
        <nav className="sidebar-nav scrollbar-clean">
          {filteredGroups.length === 0 ? (
            <div className="sidebar-search-empty">
              <span>Không tìm thấy mục khớp &quot;{searchQuery}&quot;</span>
            </div>
          ) : (
            filteredGroups.map((group) => {
              const hasVisibleItems = group.items.length > 0
              if (!hasVisibleItems) return null

              return (
                <div key={group.title} className="sidebar-nav-group">
                  <div className="sidebar-group-header">
                    <span className="sidebar-group-title">{group.title}</span>
                  </div>

                  <div className="sidebar-group-items">
                    {group.items.map((item) => {
                      const Icon = item.icon
                      const itemNormPath = item.path.replace(/\/$/, '') || '/'

                      // Exact match for base dashboard, prefix match for specific subroutes
                      const isActive =
                        itemNormPath === basePath
                          ? currentPath === basePath
                          : currentPath === itemNormPath || currentPath.startsWith(`${itemNormPath}/`)

                      return (
                        <div key={item.id} className="sidebar-item-wrapper">
                          <Link
                            to={item.path}
                            onClick={onCloseMobile}
                            className={`sidebar-nav-link ${isActive ? 'active' : ''}`.trim()}
                            aria-current={isActive ? 'page' : undefined}
                          >
                            <span className="sidebar-nav-icon" aria-hidden="true">
                              <Icon size={17} />
                            </span>

                            <span className="sidebar-nav-label">{item.label}</span>

                            {/* Badge count if any */}
                            {item.badge !== undefined && (
                              <span className="sidebar-nav-count" aria-hidden="true">
                                {typeof item.badge === 'number' && item.badge > 99 ? '99+' : item.badge}
                              </span>
                            )}
                          </Link>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })
          )}
        </nav>

        {/* =====================================================================
            4. FOOTER: WORKSPACE SWITCHER & BACK TO LEARNER
            ===================================================================== */}
        <div className="workspace-sidebar-footer">
          {/* Quick Workspace Switcher */}
          <div className="sidebar-workspace-switcher">
            <span className="switcher-label">Chuyển không gian:</span>
            <div className="switcher-grid">
              {[
                { role: 'admin', label: 'Admin', path: '/admin' },
                { role: 'teacher', label: 'Teacher', path: '/teacher' },
                { role: 'content', label: 'Content', path: '/content' },
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

          {/* Return to Learner Portal */}
          <Link
            to="/dashboard"
            className="workspace-sidebar-back-link"
            onClick={onCloseMobile}
          >
            <div className="back-link-left">
              <ArrowLeft size={15} aria-hidden="true" />
              <span>Quay lại học viên</span>
            </div>
            <ExternalLink size={12} className="back-link-ext" aria-hidden="true" />
          </Link>
        </div>
      </aside>
    </>
  )
}
