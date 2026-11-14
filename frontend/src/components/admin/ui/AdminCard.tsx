import React from 'react'
import './AdminDesignSystem.css'

export interface AdminCardProps {
  title?: React.ReactNode
  subtitle?: React.ReactNode
  headerAction?: React.ReactNode
  footer?: React.ReactNode
  children: React.ReactNode
  className?: string
  noPadding?: boolean
}

export const AdminCard: React.FC<AdminCardProps> = ({
  title,
  subtitle,
  headerAction,
  footer,
  children,
  className = '',
  noPadding = false,
}) => {
  return (
    <div className={`admin-card ${className}`}>
      {(title || headerAction) && (
        <div className="admin-card-header">
          <div>
            {title && <h3 className="admin-card-title">{title}</h3>}
            {subtitle && <p className="admin-card-subtitle">{subtitle}</p>}
          </div>
          {headerAction && <div>{headerAction}</div>}
        </div>
      )}
      <div className={noPadding ? '' : 'admin-card-body'}>{children}</div>
      {footer && <div className="admin-card-footer">{footer}</div>}
    </div>
  )
}
