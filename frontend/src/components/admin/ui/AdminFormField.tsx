import React from 'react'
import './AdminDesignSystem.css'

export interface AdminFormFieldProps {
  label: string
  htmlFor?: string
  required?: boolean
  error?: string | null
  hint?: string
  children: React.ReactNode
  className?: string
}

export const AdminFormField: React.FC<AdminFormFieldProps> = ({
  label,
  htmlFor,
  required = false,
  error,
  hint,
  children,
  className = '',
}) => {
  return (
    <div className={`admin-form-field ${error ? 'admin-form-field-error' : ''} ${className}`}>
      <label htmlFor={htmlFor} className="admin-form-label">
        <span>{label}</span>
        {required && <span className="admin-form-required" aria-hidden="true">*</span>}
      </label>
      {children}
      {hint && !error && <p className="admin-form-hint">{hint}</p>}
      {error && (
        <p className="admin-form-error" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
