import React from 'react'
import './staff-shared.css'

export interface StaffMetricsGridProps {
  children: React.ReactNode
  columns?: 2 | 3 | 4
}

export const StaffMetricsGrid: React.FC<StaffMetricsGridProps> = ({
  children,
  columns = 4,
}) => {
  return (
    <div
      className="staff-metrics-grid"
      style={{
        gridTemplateColumns:
          columns === 2
            ? 'repeat(2, 1fr)'
            : columns === 3
              ? 'repeat(3, 1fr)'
              : undefined,
      }}
    >
      {children}
    </div>
  )
}
