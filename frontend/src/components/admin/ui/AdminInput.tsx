import React from 'react'
import './AdminDesignSystem.css'

export interface AdminInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  required?: boolean
  prefixIcon?: React.ReactNode
  helperText?: string
}

export const AdminInput = React.forwardRef<HTMLInputElement, AdminInputProps>(
  ({ label, error, required, prefixIcon, helperText, className = '', id, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined)

    return (
      <div className="admin-form-group">
        {label && (
          <label htmlFor={inputId} className="admin-label">
            {label}
            {required && <span className="admin-label-required">*</span>}
          </label>
        )}
        <div style={{ position: 'relative', width: '100%' }}>
          {prefixIcon && (
            <span
              style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--admin-text-subtle)',
                pointerEvents: 'none',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              {prefixIcon}
            </span>
          )}
          <input
            ref={ref}
            id={inputId}
            className={`admin-input ${error ? 'error' : ''} ${className}`}
            style={prefixIcon ? { paddingLeft: '38px' } : undefined}
            {...props}
          />
        </div>
        {error && <span className="admin-field-error">{error}</span>}
        {!error && helperText && (
          <span style={{ fontSize: '12px', color: 'var(--admin-text-subtle)' }}>{helperText}</span>
        )}
      </div>
    )
  }
)
AdminInput.displayName = 'AdminInput'
