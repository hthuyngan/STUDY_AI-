import React from 'react'
import './AdminDesignSystem.css'

export interface AdminBadgeProps {
  variant?: 'primary' | 'success' | 'warning' | 'danger' | 'neutral'
  showDot?: boolean
  children: React.ReactNode
  className?: string
}

export const AdminBadge: React.FC<AdminBadgeProps> = ({
  variant = 'neutral',
  showDot = true,
  children,
  className = '',
}) => {
  return (
    <span className={`admin-badge admin-badge-${variant} ${className}`}>
      {showDot && <span className="admin-badge-dot" />}
      {children}
    </span>
  )
}
