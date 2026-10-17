import type { ButtonHTMLAttributes } from 'react'
import type { LucideIcon } from 'lucide-react'

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: LucideIcon
  label: string
  size?: 'sm' | 'md'
  variant?: 'outline' | 'ghost'
  badgeCount?: number
}

export function IconButton({
  icon: Icon,
  label,
  size = 'md',
  variant = 'ghost',
  badgeCount,
  className = '',
  ...props
}: IconButtonProps) {
  const sizeClasses = size === 'sm' ? 'btn-icon-sm' : 'btn-icon-md'
  const variantClasses = variant === 'outline' ? 'btn-outline' : 'btn-ghost'

  return (
    <button
      type="button"
      className={`btn btn-icon ${sizeClasses} ${variantClasses} ${className}`.trim()}
      aria-label={label}
      title={label}
      {...props}
    >
      <Icon size={size === 'sm' ? 16 : 18} aria-hidden />
      {badgeCount !== undefined && badgeCount > 0 && (
        <span className="icon-btn-badge" aria-hidden>
          {badgeCount > 99 ? '99+' : badgeCount}
        </span>
      )}
    </button>
  )
}
