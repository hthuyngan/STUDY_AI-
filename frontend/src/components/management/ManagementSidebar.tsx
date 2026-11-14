import React, { useState } from 'react'
import {
  GraduationCap,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  Search,
} from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import type { WorkspaceConfig } from '@/components/layout/workspaceNavigation'
import './ManagementLayout.css'

export interface ManagementSidebarProps {
  config: WorkspaceConfig
  collapsed?: boolean
  onToggleCollapse?: () => void
  className?: string
}

export const ManagementSidebar: React.FC<ManagementSidebarProps> = ({
  config,
  collapsed = false,
  onToggleCollapse,
  className = '',
}) => {
  const location = useLocation()
  const [filterText, setFilterText] = useState('')

  const currentPath = location.pathname.replace(/\/$/, '') || '/'
  const basePath = config.basePath.replace(/\/$/, '') || '/'

  // Filter groups if search is typed
  const displayedGroups = config.groups
    .map((g) => ({
      ...g,
      items: filterText.trim()
        ? g.items.filter((item) => item.label.toLowerCase().includes(filterText.toLowerCase().trim()))
        : g.items,
    }))
    .filter((g) => g.items.length > 0)

  return (
    <aside
      className={`mgmt-sidebar ${collapsed ? 'collapsed' : ''} ${className}`.trim()}
      aria-label={`Thanh điều hướng ${config.name}`}
    >
      {/* Brand Header */}
      <div className="mgmt-sidebar-brand">
        <Link to={config.basePath} className="mgmt-brand-link" title={`STUDY_AI - ${config.name}`}>
          <div className="mgmt-brand-seal" aria-hidden="true">
            <GraduationCap size={16} />
          </div>
          {!collapsed && (
            <div className="mgmt-brand-meta">
              <span className="mgmt-brand-name">STUDY_AI</span>
              <span className="mgmt-brand-tag">{config.subLabel}</span>
            </div>
          )}
        </Link>
      </div>

      {/* Quick Menu Search (when expanded) */}
      {!collapsed && (
        <div style={{ padding: '8px 12px 0 12px' }}>
          <div style={{ position: 'relative' }}>
            <Search
              size={12}
              style={{
                position: 'absolute',
                left: '8px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--mgmt-text-subtle)',
                pointerEvents: 'none',
              }}
            />
            <input
              type="text"
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              placeholder="Tìm nhanh menu..."
              aria-label="Tìm nhanh mục chức năng"
              style={{
                width: '100%',
                height: '28px',
                padding: '0 8px 0 26px',
                fontSize: '12px',
                border: '1px solid var(--mgmt-border)',
                borderRadius: 'var(--mgmt-radius-md)',
                backgroundColor: 'var(--mgmt-bg-subtle)',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>
        </div>
      )}

      {/* Navigation Groups */}
      <nav className="mgmt-sidebar-nav" aria-label="Menu quản trị">
        {displayedGroups.map((group) => (
          <div key={group.id} className="mgmt-nav-group">
            {!collapsed && <div className="mgmt-nav-group-title">{group.title}</div>}
            <div className="mgmt-nav-item-list">
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
                    className={`mgmt-nav-link ${isActive ? 'active' : ''}`}
                    aria-current={isActive ? 'page' : undefined}
                    title={collapsed ? item.label : undefined}
                  >
                    <div className="mgmt-nav-link-left">
                      <Icon className="mgmt-nav-icon" size={16} aria-hidden="true" />
                      {!collapsed && <span className="mgmt-nav-label">{item.label}</span>}
                    </div>
                    {!collapsed && item.badge !== undefined && (
                      <span className="mgmt-nav-badge">{item.badge}</span>
                    )}
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer Switcher & Collapse */}
      <div className="mgmt-sidebar-footer">
        {/* Workspace Quick Switcher */}
        {!collapsed && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '4px', marginBottom: '4px' }}>
            {[
              { role: 'admin', label: 'Admin', path: '/admin' },
              { role: 'teacher', label: 'GV', path: '/teacher' },
              { role: 'content', label: 'Nội dung', path: '/content' },
              { role: 'support', label: 'Hỗ trợ', path: '/support' },
            ].map((ws) => (
              <Link
                key={ws.role}
                to={ws.path}
                className="mgmt-page-btn"
                style={{
                  fontSize: '11px',
                  fontWeight: config.role === ws.role ? 700 : 500,
                  backgroundColor: config.role === ws.role ? 'var(--mgmt-primary-light)' : 'transparent',
                  color: config.role === ws.role ? 'var(--mgmt-primary)' : 'var(--mgmt-text-muted)',
                  borderColor: config.role === ws.role ? 'var(--mgmt-primary-border)' : 'var(--mgmt-border)',
                  textDecoration: 'none',
                }}
              >
                {ws.label}
              </Link>
            ))}
          </div>
        )}

        {/* Back to Learner Portal */}
        <Link
          to="/dashboard"
          className="mgmt-footer-btn"
          title="Quay lại giao diện học viên"
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ArrowLeft size={14} aria-hidden="true" />
            {!collapsed && <span>Quay lại học viên</span>}
          </div>
        </Link>

        {/* Collapse Sidebar Button */}
        {onToggleCollapse && (
          <button
            type="button"
            className="mgmt-footer-btn"
            onClick={onToggleCollapse}
            aria-label={collapsed ? 'Mở rộng thanh điều hướng' : 'Thu gọn thanh điều hướng'}
          >
            {!collapsed && <span>Thu gọn</span>}
            {collapsed ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
          </button>
        )}
      </div>
    </aside>
  )
}
