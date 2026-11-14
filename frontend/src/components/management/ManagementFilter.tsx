import React from 'react'
import { Search, RotateCcw } from 'lucide-react'
import './ManagementLayout.css'

export interface ManagementFilterProps {
  search?: string
  onSearchChange?: (val: string) => void
  searchPlaceholder?: string
  searchLabel?: string
  onReset?: () => void
  children?: React.ReactNode
  actions?: React.ReactNode
  className?: string
}

export const ManagementFilter: React.FC<ManagementFilterProps> = ({
  search = '',
  onSearchChange,
  searchPlaceholder = 'Tìm kiếm dữ liệu...',
  searchLabel = 'Tìm kiếm',
  onReset,
  children,
  actions,
  className = '',
}) => {
  return (
    <div className={`mgmt-filter-bar ${className}`.trim()} role="search">
      <div className="mgmt-filter-group">
        {onSearchChange && (
          <div className="mgmt-search-input-wrap">
            <Search size={15} className="mgmt-search-icon" aria-hidden="true" />
            <input
              type="search"
              className="mgmt-search-input"
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={searchPlaceholder}
              aria-label={searchLabel}
            />
          </div>
        )}

        {children}

        {onReset && (
          <button
            type="button"
            className="mgmt-btn mgmt-btn-secondary"
            onClick={onReset}
            title="Đặt lại bộ lọc"
            aria-label="Đặt lại bộ lọc"
          >
            <RotateCcw size={13} aria-hidden="true" />
            <span>Đặt lại</span>
          </button>
        )}
      </div>

      {actions && <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>{actions}</div>}
    </div>
  )
}

