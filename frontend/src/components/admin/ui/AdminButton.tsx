import React from 'react'
import { Loader2 } from 'lucide-react'
import './AdminDesignSystem.css'

export interface AdminButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  icon?: React.ReactNode
  isLoading?: boolean
}

export const AdminButton: React.FC<AdminButtonProps> = ({
  variant = 'secondary',
  size = 'md',
  icon,
  isLoading = false,
  children,
  className = '',
  disabled,
  ...props
}) => {
  return (
    <button
      className={`admin-btn admin-btn-${variant} admin-btn-${size} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <Loader2 className="animate-spin" size={size === 'sm' ? 14 : size === 'lg' ? 18 : 16} />
      ) : (
        icon && <span className="admin-btn-icon">{icon}</span>
      )}
      {children}
    </button>
  )
}
