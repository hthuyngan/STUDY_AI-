import React from 'react'
import { Search, X } from 'lucide-react'
import './FilterBar.css'

export interface FilterOption {
  label: string
  value: string
}

export interface FilterSelect {
  id: string
  label: string
  value: string
  onChange: (val: string) => void
  options: FilterOption[]
}

export interface FilterItem {
  key: string
  label: string
  value: string
  options: FilterOption[]
  onChange: (val: string) => void
}

export interface FilterBarProps {
  search?: {
    value: string
    onChange: (val: string) => void
    placeholder?: string
  }
  selects?: FilterSelect[]
  actions?: React.ReactNode

  searchValue?: string
  onSearchChange?: (val: string) => void
  searchPlaceholder?: string
  filters?: FilterItem[]
}

export const FilterBar: React.FC<FilterBarProps> = ({
  search,
  selects = [],
  actions,
  searchValue,
  onSearchChange,
  searchPlaceholder,
  filters,
}) => {
  const actualSearch =
    search ||
    (onSearchChange !== undefined
      ? {
          value: searchValue || '',
          onChange: onSearchChange,
          placeholder: searchPlaceholder,
        }
      : undefined)

  const actualSelects =
    selects.length > 0
      ? selects
      : (filters || []).map((f) => ({
          id: f.key,
          label: f.label,
          value: f.value,
          options: f.options,
          onChange: f.onChange,
        }))
  return (
    <div className="filter-bar-root">
      <div className="filter-bar-inputs">
        {actualSearch && (
          <div className="filter-search-wrapper">
            <Search size={15} className="filter-search-icon" aria-hidden="true" />
            <input
              type="text"
              className="filter-search-input"
              value={actualSearch.value}
              onChange={(e) => actualSearch.onChange(e.target.value)}
              placeholder={actualSearch.placeholder || 'Tìm kiếm...'}
              aria-label={actualSearch.placeholder || 'Tìm kiếm'}
            />
            {actualSearch.value && (
              <button
                type="button"
                className="filter-search-clear"
                onClick={() => actualSearch.onChange('')}
                aria-label="Xóa nội dung tìm kiếm"
              >
                <X size={14} />
              </button>
            )}
          </div>
        )}

        {actualSelects.map((sel) => (
          <div key={sel.id} className="filter-select-wrapper">
            <select
              id={`filter-${sel.id}`}
              className="filter-select"
              value={sel.value}
              onChange={(e) => sel.onChange(e.target.value)}
              aria-label={sel.label}
            >
              {sel.options.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>

      {actions && <div className="filter-bar-actions">{actions}</div>}
    </div>
  )
}
