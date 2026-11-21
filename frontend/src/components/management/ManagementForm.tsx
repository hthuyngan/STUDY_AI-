import React from 'react'
import './ManagementLayout.css'

export interface FormFieldProps {
  label: string
  required?: boolean
  error?: string
  hint?: string
  htmlFor?: string
  children: React.ReactNode
  className?: string
}

export const FormField: React.FC<FormFieldProps> = ({
  label,
  required,
  error,
  hint,
  htmlFor,
  children,
  className = '',
}) => {
  return (
    <div className={`mgmt-form-field ${className}`.trim()} style={{ marginBottom: '14px' }}>
      <label
        htmlFor={htmlFor}
        style={{
          display: 'block',
          fontSize: '12.5px',
          fontWeight: 600,
          color: error ? 'var(--mgmt-danger)' : 'var(--mgmt-text-primary)',
          marginBottom: '5px',
        }}
      >
        {label}
        {required && (
          <span style={{ color: 'var(--mgmt-danger)', marginLeft: '3px' }} aria-hidden="true">
            *
          </span>
        )}
      </label>
      {children}
      {error && (
        <div
          role="alert"
          style={{
            fontSize: '11.5px',
            color: 'var(--mgmt-danger)',
            marginTop: '4px',
            fontWeight: 500,
          }}
        >
          {error}
        </div>
      )}
      {!error && hint && (
        <div style={{ fontSize: '11.5px', color: 'var(--mgmt-text-muted)', marginTop: '4px' }}>
          {hint}
        </div>
      )}
    </div>
  )
}

export interface ManagementFormProps extends React.FormHTMLAttributes<HTMLFormElement> {
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void
  children: React.ReactNode
}

export const ManagementForm: React.FC<ManagementFormProps> = ({
  onSubmit,
  children,
  ...props
}) => {
  return (
    <form onSubmit={onSubmit} noValidate {...props}>
      {children}
    </form>
  )
}
