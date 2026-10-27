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
              className="sidebar-toggle-btn"
              onClick={onToggleCollapse}
              aria-label={collapsed ? 'Mở rộng thanh điều hướng' : 'Thu gọn thanh điều hướng'}
              title={collapsed ? 'Mở rộng (Ctrl+B)' : 'Thu gọn (Ctrl+B)'}
            >
              {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
            </button>
          )}
        </div>

        {/* Navigation list */}
        <nav className="sidebar-nav">
          {config.groups.map((group) => (
            <div key={group.id} className="sidebar-section">
              {!collapsed && (
                <div className="sidebar-section-title">{group.title}</div>
              )}
              <ul className="sidebar-list">
                {group.items.map((item) => {
                  const Icon = item.icon
                  const isActive =
                    location.pathname === item.path ||
                    (item.path !== config.basePath &&
                      location.pathname.startsWith(item.path))

                  return (
                    <li key={item.id} className="sidebar-item-wrapper">
                      <Link
                        to={item.path}
                        className={`sidebar-item ${isActive ? 'active' : ''}`.trim()}
                        onClick={onCloseMobile}
                        aria-current={isActive ? 'page' : undefined}
                        title={collapsed ? item.label : undefined}
                      >
                        <span className="sidebar-item-icon" aria-hidden="true">
                          <Icon size={18} />
                        </span>
                        {!collapsed && (
                          <span className="sidebar-item-label">{item.label}</span>
                        )}
                        {!collapsed && item.badge && (
                          <span className="sidebar-item-badge">{item.badge}</span>
                        )}
                      </Link>
                    </li>
                  )
                })}
              </ul>
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
