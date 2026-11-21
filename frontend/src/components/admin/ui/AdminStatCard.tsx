import React from 'react'
import { TrendingUp, TrendingDown } from 'lucide-react'
import './AdminDesignSystem.css'

export interface AdminStatCardProps {
  title: string
  value: string | number
  icon?: React.ReactNode
  variant?: 'primary' | 'success' | 'warning' | 'danger'
  change?: {
    value: string | number
    isPositive?: boolean
    label?: string
  }
  subtitle?: string
  className?: string
}

export const AdminStatCard: React.FC<AdminStatCardProps> = ({
  title,
  value,
  icon,
  variant = 'primary',
  change,
  subtitle,
  className = '',
}) => {
  return (
    <div className={`admin-stat-card ${className}`}>
      <div className="admin-stat-card-header">
        <h4 className="admin-stat-card-title">{title}</h4>
        {icon && <div className={`admin-stat-card-icon ${variant}`}>{icon}</div>}
      </div>
      <div className="admin-stat-card-body">
        <div className="admin-stat-card-value">{value}</div>
        {change && (
          <div className={`admin-stat-card-change ${change.isPositive ? 'up' : 'down'}`}>
            {change.isPositive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
            <span>{change.value}</span>
          </div>
        )}
      </div>
      {subtitle && <div className="admin-stat-card-subtitle">{subtitle}</div>}
    </div>
  )
}
