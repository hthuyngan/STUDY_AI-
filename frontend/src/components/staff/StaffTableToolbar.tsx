import React from 'react'
import { Search } from 'lucide-react'
import './staff-shared.css'

export interface StaffTableToolbarProps {
  searchValue?: string
  onSearchChange?: (val: string) => void
  searchPlaceholder?: string
  filters?: React.ReactNode
  actions?: React.ReactNode
}

export const StaffTableToolbar: React.FC<StaffTableToolbarProps> = ({
  searchValue,
  onSearchChange,
  searchPlaceholder = 'Tìm kiếm...',
  filters,
  actions,
}) => {
  return (
    <div className="staff-table-toolbar-root">
      <div className="staff-toolbar-left">
        {onSearchChange !== undefined && (
          <div className="staff-search-input-wrap">
            <Search size={14} className="search-icon" aria-hidden="true" />
            <input
              type="text"
              className="staff-search-input"
              placeholder={searchPlaceholder}
              value={searchValue || ''}
              onChange={(e) => onSearchChange(e.target.value)}
              aria-label={searchPlaceholder}
            />
          </div>
        )}
        {filters}
      </div>

      {actions && <div className="staff-toolbar-right">{actions}</div>}
    </div>
  )
}
