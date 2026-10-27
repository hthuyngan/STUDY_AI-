import React from 'react'
import type { LucideIcon } from 'lucide-react'
import './StaffMetricCard.css'

export interface StaffMetricCardProps {
  label: string
  value: string | number
  context?: string
  hint?: string
  icon?: LucideIcon
  trend?: {
    value: string
    isPositive?: boolean
  }
}

export const StaffMetricCard: React.FC<StaffMetricCardProps> = ({
  label,
  value,
  context,
  hint,
  icon: Icon,
  trend,
}) => {
  const displayContext = context || hint
  return (
    <div className="staff-metric-card">
      <div className="staff-metric-header">
        <span className="staff-metric-label">{label}</span>
        {Icon && (
          <span className="staff-metric-icon-wrap" aria-hidden="true">
            <Icon size={16} />
          </span>
        )}
      </div>

      <div className="staff-metric-body">
        <span className="staff-metric-value">{value}</span>
        {trend && (
          <span
            className={`staff-metric-trend ${trend.isPositive ? 'trend-positive' : 'trend-negative'}`}
          >
            {trend.isPositive ? '↑' : '↓'} {trend.value}
          </span>
        )}
      </div>

      {displayContext && <p className="staff-metric-context">{displayContext}</p>}
    </div>
  )
}
