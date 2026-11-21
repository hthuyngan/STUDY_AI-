import React from 'react'
import { LogOut } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/auth/useAuth'
import './ManagementLayout.css'

export interface BreadcrumbItem {
  label: string
  path?: string
}

export interface ManagementHeaderProps {
  title: string
  breadcrumbs?: BreadcrumbItem[]
  actions?: React.ReactNode
  className?: string
}

export const ManagementHeader: React.FC<ManagementHeaderProps> = ({
  title,
  breadcrumbs,
  actions,
  className = '',
}) => {
  const { user, logout } = useAuth()

  return (
    <header className={`mgmt-header ${className}`.trim()}>
      <div className="mgmt-header-left">
        <div>
          {breadcrumbs && breadcrumbs.length > 0 && (
            <div className="mgmt-header-breadcrumb">
              {breadcrumbs.map((crumb, idx) => (
                <React.Fragment key={idx}>
                  {idx > 0 && <span className="mgmt-header-crumb-sep">/</span>}
                  {crumb.path ? (
                    <Link
                      to={crumb.path}
                      style={{ color: 'inherit', textDecoration: 'none' }}
                    >
                      {crumb.label}
                    </Link>
                  ) : (
                    <span>{crumb.label}</span>
                  )}
                </React.Fragment>
              ))}
            </div>
          )}
          <h1 className="mgmt-header-title">{title}</h1>
        </div>
      </div>

      <div className="mgmt-header-right">
        {actions && <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>{actions}</div>}

        <div className="mgmt-header-user">
          <div className="mgmt-user-avatar" aria-hidden="true">
            {(user?.displayName || user?.email || 'A').charAt(0).toUpperCase()}
          </div>
          <span style={{ fontWeight: 600, fontSize: '13px' }}>
            {user?.displayName || user?.email || 'Quản trị viên'}
          </span>
          <button
            type="button"
            onClick={() => logout()}
            className="mgmt-btn mgmt-btn-secondary"
            style={{ height: '30px', padding: '0 8px', fontSize: '12px' }}
            title="Đăng xuất"
            aria-label="Đăng xuất"
          >
            <LogOut size={13} aria-hidden="true" />
            <span>Thoát</span>
          </button>
        </div>
      </div>
    </header>
  )
}
