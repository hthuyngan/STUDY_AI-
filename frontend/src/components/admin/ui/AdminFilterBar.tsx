import React from 'react'
import { Search } from 'lucide-react'
import './AdminDesignSystem.css'

export interface AdminFilterBarProps {
  searchValue?: string
  onSearchChange?: (val: string) => void
  searchPlaceholder?: string
  children?: React.ReactNode
  extraActions?: React.ReactNode
  className?: string
}

export const AdminFilterBar: React.FC<AdminFilterBarProps> = ({
  searchValue,
  onSearchChange,
  searchPlaceholder = 'Tìm kiếm...',
  children,
  extraActions,
  className = '',
}) => {
  return (
    <div className={`admin-filter-bar ${className}`}>
      <div className="admin-filter-group">
        {onSearchChange !== undefined && (
          <div className="admin-search-wrapper">
            <Search size={16} className="admin-search-icon" />
            <input
              type="text"
              value={searchValue || ''}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={searchPlaceholder}
              className="admin-input admin-search-input"
            />
          </div>
        )}
        {children}
      </div>
      {extraActions && <div className="admin-filter-actions">{extraActions}</div>}
    </div>
  )
}
