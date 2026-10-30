import React from 'react'
import './SummaryStrip.css'

export interface SummaryStripItem {
  id: string
  label: string
  value: number | string
  color?: string
}

export interface SummaryStripProps {
  items: SummaryStripItem[]
  ariaLabel?: string
  className?: string
}

export const SummaryStrip: React.FC<SummaryStripProps> = ({
  items,
  ariaLabel = 'Thống kê tổng quan nhanh',
  className = '',
}) => {
  return (
    <div
      className={`teacher-summary-strip admin-summary-strip ${className}`.trim()}
      role="region"
      aria-label={ariaLabel}
    >
      {items.map((item) => (
        <div key={item.id} className="teacher-strip-item admin-strip-item">
          <span
            className="teacher-strip-dot"
            style={{ backgroundColor: item.color || 'var(--navy-primary, #102a43)' }}
            aria-hidden="true"
          />
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

