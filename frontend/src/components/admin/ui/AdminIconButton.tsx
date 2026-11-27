import React from 'react'
import './AdminDesignSystem.css'

export interface AdminIconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  label: string
  icon: React.ReactNode
  variant?: 'ghost' | 'secondary' | 'danger'
  size?: 'sm' | 'md'
}

export const AdminIconButton: React.FC<AdminIconButtonProps> = ({
  label,
  icon,
  variant = 'ghost',
  size = 'sm',
  className = '',
  title,
  ...props
}) => {
  const tooltipText = title || label
  return (
    <button
      type="button"
      className={`admin-icon-btn admin-icon-btn-${variant} admin-icon-btn-${size} ${className}`}
      aria-label={label}
      title={tooltipText}
      {...props}
    >
      {icon}
    </button>
  )
}
