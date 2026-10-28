import React from 'react'
import './staff-shared.css'

export interface StaffPageHeaderProps {
  title: string
  subtitle?: string
  badgeText?: string
  eyebrow?: string
  actions?: React.ReactNode
}

export const StaffPageHeader: React.FC<StaffPageHeaderProps> = ({
  title,
  subtitle,
  badgeText,
  eyebrow,
  actions,
}) => {
  return (
    <div className="staff-page-header-root">
      <div className="staff-header-titles">
        {eyebrow && <span className="staff-header-eyebrow">{eyebrow}</span>}
        {badgeText && (
          <div className="staff-header-badge">
            <span className="badge-dot" aria-hidden="true" />
            <span>{badgeText}</span>
          </div>
        )}
        <h1 className="staff-header-title">{title}</h1>
        {subtitle && <p className="staff-header-subtitle">{subtitle}</p>}
      </div>

      {actions && <div className="staff-header-actions">{actions}</div>}
    </div>
  )
}
