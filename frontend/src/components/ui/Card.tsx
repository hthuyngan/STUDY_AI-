import type { HTMLAttributes, ReactNode } from 'react'

export interface CardProps extends Omit<HTMLAttributes<HTMLElement>, 'title'> {
  title?: ReactNode
  subtitle?: ReactNode
  icon?: ReactNode
  action?: ReactNode
  footer?: ReactNode
  isFlushList?: boolean
  children: ReactNode
}

export function Card({
  title,
  subtitle,
  icon,
  action,
  footer,
  isFlushList = false,
  children,
  className = '',
  ...props
}: CardProps) {
  const hasHeader = Boolean(title || icon || action)

  return (
    <section
      className={`card ${isFlushList ? 'card-flush' : ''} ${className}`.trim()}
      {...props}
    >
      {hasHeader && (
        <header className="card-header">
          <div className="card-header-left">
            {icon && <span className="card-header-icon" aria-hidden>{icon}</span>}
            <div className="card-title-group">
              {title && <h2 className="card-title">{title}</h2>}
              {subtitle && <p className="card-subtitle">{subtitle}</p>}
            </div>
          </div>
          {action && <div className="card-header-action">{action}</div>}
        </header>
      )}

      <div className={`card-body ${isFlushList ? 'card-body-flush' : ''}`}>
        {children}
      </div>

      {footer && <footer className="card-footer">{footer}</footer>}
    </section>
  )
}
