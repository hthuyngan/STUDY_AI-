import React from 'react'
import { Search, X } from 'lucide-react'
import './AdminDesignSystem.css'

export interface AdminSearchInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  ariaLabel?: string
  className?: string
  disabled?: boolean
}

export const AdminSearchInput: React.FC<AdminSearchInputProps> = ({
  value,
  onChange,
  placeholder = 'Tìm kiếm...',
  ariaLabel = 'Tìm kiếm',
  className = '',
  disabled = false,
}) => {
  return (
    <div className={`admin-search-wrap ${className}`}>
      <Search size={15} className="admin-search-icon" aria-hidden="true" />
      <input
        type="search"
        className="admin-input admin-search-input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={ariaLabel}
        disabled={disabled}
      />
      {value && !disabled && (
        <button
          type="button"
          className="admin-search-clear"
          onClick={() => onChange('')}
          aria-label="Xóa từ khóa tìm kiếm"
          title="Xóa tìm kiếm"
        >
          <X size={14} />
        </button>
      )}
    </div>
  )
}
