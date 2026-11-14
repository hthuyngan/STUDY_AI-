import React from 'react'
import './AdminDesignSystem.css'

export interface AdminSelectOption {
  value: string | number
  label: string
}

export interface AdminSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  required?: boolean
  options?: AdminSelectOption[]
  helperText?: string
}

export const AdminSelect = React.forwardRef<HTMLSelectElement, AdminSelectProps>(
  ({ label, error, required, options, helperText, children, className = '', id, ...props }, ref) => {
    const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined)

    return (
      <div className="admin-form-group">
        {label && (
          <label htmlFor={selectId} className="admin-label">
            {label}
            {required && <span className="admin-label-required">*</span>}
          </label>
        )}
        <select
          ref={ref}
          id={selectId}
          className={`admin-select ${error ? 'error' : ''} ${className}`}
          {...props}
        >
          {options
            ? options.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))
            : children}
        </select>
        {error && <span className="admin-field-error">{error}</span>}
        {!error && helperText && (
          <span style={{ fontSize: '12px', color: 'var(--admin-text-subtle)' }}>{helperText}</span>
        )}
      </div>
    )
  }
)
AdminSelect.displayName = 'AdminSelect'

