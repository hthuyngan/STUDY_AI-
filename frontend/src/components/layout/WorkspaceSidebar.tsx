import React from 'react'
import { ChevronLeft, ChevronRight, GraduationCap, ArrowLeft } from 'lucide-react'
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

  // Normalize paths for reliable active state matching
  const currentPath = location.pathname.replace(/\/$/, '') || '/'
  const basePath = config.basePath.replace(/\/$/, '') || '/'

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
        className={`sidebar workspace-sidebar ${collapsed ? 'collapsed' : ''} ${mobileOpen ? 'mobile-open' : ''}`.trim()}
        aria-label={`Thanh điều hướng ${config.name}`}
      >
        {/* Brand / Role badge */}
        <div className="sidebar-header">
          <Link
            to={config.basePath}
            className="sidebar-brand"
            onClick={onCloseMobile}
            title={`${config.name} - STUDY AI`}
          >
            <div className="sidebar-brand-icon" aria-hidden="true">
              <GraduationCap size={20} />
            </div>
            {!collapsed && (
              <div className="sidebar-brand-text">
                <span className="brand-name">STUDY AI</span>
                <span className="brand-role-badge">{config.subLabel}</span>
              </div>
            )}
          </Link>

          {onToggleCollapse && (
            <button
              type="button"
              className="sidebar-collapse-btn desktop-only"
              onClick={onToggleCollapse}
              aria-label={collapsed ? 'Mở rộng thanh điều hướng' : 'Thu gọn thanh điều hướng'}
              title={collapsed ? 'Mở rộng (Ctrl+B)' : 'Thu gọn (Ctrl+B)'}
            >
              {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
            </button>
          )}
        </div>

        {/* Navigation list */}
        <nav className="sidebar-nav scrollbar-clean">
          {config.groups.map((group) => (
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
                    <Link
                      key={item.id}
                      to={item.path}
                      className={`sidebar-nav-link ${isActive ? 'active' : ''} ${collapsed ? 'collapsed' : ''}`.trim()}
                      onClick={onCloseMobile}
                      aria-current={isActive ? 'page' : undefined}
                      title={collapsed ? item.label : undefined}
                    >
                      <Icon className="sidebar-nav-icon" size={18} aria-hidden="true" />
                      {!collapsed && (
                        <span className="sidebar-nav-label">{item.label}</span>
                      )}
                      {!collapsed && item.badge && (
                        <span className="sidebar-nav-count">{item.badge}</span>
                      )}
                      {collapsed && item.badge && (
                        <span className="sidebar-nav-dot" aria-hidden="true" />
                      )}
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer Quick Return */}
        <div className="workspace-sidebar-footer">
          <Link
            to="/dashboard"
            className="workspace-sidebar-back-link"
            onClick={onCloseMobile}
            title={collapsed ? 'Quay lại học viên' : undefined}
          >
            <ArrowLeft size={16} aria-hidden="true" />
            {!collapsed && <span>Quay lại học viên</span>}
          </Link>
        </div>
      </aside>
    </>
  )
}
