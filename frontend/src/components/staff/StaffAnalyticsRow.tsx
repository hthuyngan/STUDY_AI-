import React from 'react'
import './staff-shared.css'

export interface StaffAnalyticsRowProps {
  primary: React.ReactNode
  secondary: React.ReactNode
}

export const StaffAnalyticsRow: React.FC<StaffAnalyticsRowProps> = ({
  primary,
  secondary,
}) => {
  return (
    <div className="staff-analytics-grid-row">
      <div className="staff-analytics-primary" style={{ minWidth: 0 }}>
        {primary}
      </div>
      <div className="staff-analytics-secondary" style={{ minWidth: 0 }}>
        {secondary}
      </div>
    </div>
  )
}
