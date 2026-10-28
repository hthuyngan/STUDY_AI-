import React from 'react'
import './staff-shared.css'

export interface StaffOperationsRowProps {
  left: React.ReactNode
  right: React.ReactNode
}

export const StaffOperationsRow: React.FC<StaffOperationsRowProps> = ({
  left,
  right,
}) => {
  return (
    <div className="staff-operations-grid-row">
      <div className="staff-operations-left" style={{ minWidth: 0 }}>
        {left}
      </div>
      <div className="staff-operations-right" style={{ minWidth: 0 }}>
        {right}
      </div>
    </div>
  )
}
