import React from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import './AdminDesignSystem.css'

export interface BreadcrumbItem {
  label: string
  href?: string
}

export interface AdminPageHeaderProps {
  title: React.ReactNode
  subtitle?: React.ReactNode
  breadcrumbs?: BreadcrumbItem[]
  actions?: React.ReactNode
  className?: string
}

export const AdminPageHeader: React.FC<AdminPageHeaderProps> = ({
  title,
  subtitle,
  breadcrumbs,
  actions,
  className = '',
}) => {
  return (
    <div className={`admin-page-header ${className}`}>
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav className="admin-breadcrumb" aria-label="Breadcrumb">
          {breadcrumbs.map((item, index) => {
            const isLast = index === breadcrumbs.length - 1
            return (
              <React.Fragment key={index}>
                {item.href && !isLast ? (
                  <Link to={item.href} className="admin-breadcrumb-link">
                    {item.label}
                  </Link>
                ) : (
                  <span className={isLast ? 'admin-breadcrumb-current' : ''}>{item.label}</span>
                )}
                {!isLast && <ChevronRight size={12} className="admin-breadcrumb-separator" />}
              </React.Fragment>
            )
          })}
        </nav>
      )}
      <div className="admin-page-header-top">
        <div className="admin-page-header-titles">
          <h1 className="admin-page-title">{title}</h1>
          {subtitle && <p className="admin-page-subtitle">{subtitle}</p>}
        </div>
        {actions && <div className="admin-page-actions">{actions}</div>}
      </div>
    </div>
  )
}
