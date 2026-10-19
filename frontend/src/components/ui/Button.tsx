import type { ButtonHTMLAttributes, ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'

export type ButtonVariant = 'outline' | 'primary' | 'secondary' | 'ghost'
export type ButtonSize = 'sm' | 'md' | 'lg'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  icon?: LucideIcon
  isLoading?: boolean
  children?: ReactNode
  fullWidth?: boolean
}

export function Button({
  variant = 'outline',
  size = 'md',
  icon: Icon,
  isLoading = false,
  children,
  fullWidth = false,
  className = '',
  disabled,
  onClick,
  ...props
}: ButtonProps) {
  const baseClasses = 'btn'
  const variantClass =
    variant === 'primary'
      ? 'btn-primary'
      : variant === 'secondary'
        ? 'btn-secondary'
        : variant === 'ghost'
          ? 'btn-ghost'
          : 'btn-outline'

  const sizeClass = size === 'sm' ? 'btn-sm' : size === 'lg' ? 'btn-lg' : ''
  const widthClass = fullWidth ? 'w-full' : ''

  return (
    <button
      type="button"
      className={`${baseClasses} ${variantClass} ${sizeClass} ${widthClass} ${className}`.trim()}
      disabled={disabled || isLoading}
      aria-busy={isLoading || undefined}
      onClick={onClick}
      {...props}
    >
      {Icon && !isLoading && <Icon className="btn-icon-svg" size={size === 'sm' ? 14 : 16} aria-hidden />}
      {isLoading && <span className="btn-spinner" aria-hidden />}
      <span>{children}</span>
    </button>
  )
}
