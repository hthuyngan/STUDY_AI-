import type { ReactNode } from 'react'

export type BadgeVariant = 'neutral' | 'primary' | 'success' | 'warning' | 'danger'

export interface BadgeProps {
  variant?: BadgeVariant
  size?: 'sm' | 'md'
  icon?: ReactNode
  children: ReactNode
  className?: string
}

export function Badge({
  variant = 'neutral',
  size = 'md',
  icon,
  children,
  className = '',
}: BadgeProps) {
  return (
    <span className={`badge badge-${variant} badge-${size} ${className}`.trim()}>
      {icon && <span className="badge-icon" aria-hidden>{icon}</span>}
      <span>{children}</span>
    </span>
  )
}
