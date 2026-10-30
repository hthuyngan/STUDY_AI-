import React from 'react'

export interface AdminSummaryStripItem {
  id: string
  label: string
  value: number | string
  color: string
}

export interface AdminSummaryStripProps {
  items: AdminSummaryStripItem[]
  ariaLabel?: string
}

export const AdminSummaryStrip: React.FC<AdminSummaryStripProps> = ({
  items,
  ariaLabel = 'Thống kê tổng quan nhanh',
}) => {
  return (
    <div className="teacher-summary-strip admin-summary-strip" role="region" aria-label={ariaLabel}>
      {items.map((item) => (
        <div key={item.id} className="teacher-strip-item admin-strip-item">
          <span className="teacher-strip-dot" style={{ backgroundColor: item.color }} aria-hidden="true" />
          <div className="teacher-strip-content">
            <span className="teacher-strip-val">
              {typeof item.value === 'number' ? item.value.toLocaleString() : item.value}
            </span>
            <span className="teacher-strip-lbl">{item.label}</span>
          </div>
        </div>
      ))}
    </div>
  )
}
