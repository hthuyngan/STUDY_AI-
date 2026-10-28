import React from 'react'
import type { LucideIcon } from 'lucide-react'
import './staff-shared.css'

export interface StaffMetricCardProps {
  title: string
  value: string | number
  delta?: {
    text: string
    type?: 'positive' | 'negative' | 'neutral'
  }
  context?: string
  icon?: LucideIcon
  onClick?: () => void
}

export const StaffMetricCard: React.FC<StaffMetricCardProps> = ({
  title,
  value,
  delta,
  context,
  icon: Icon,
  onClick,
}) => {
  return (
    <div
      className="staff-metric-card-box"
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
    >
      <div className="staff-metric-card-header">
        <h4 className="staff-metric-card-title">{title}</h4>
        {Icon && (
          <div className="staff-metric-icon-bubble" aria-hidden="true">
            <Icon size={16} />
          </div>
        )}
      </div>

      <div>
        <div className="staff-metric-value-row">
          <span className="staff-metric-value-text">{value}</span>
          {delta && (
            <span
              className={`staff-metric-delta-tag ${delta.type || 'neutral'}`}
            >
              {delta.text}
            </span>
          )}
        </div>
        {context && <p className="staff-metric-context-text">{context}</p>}
      </div>
    </div>
  )
}
