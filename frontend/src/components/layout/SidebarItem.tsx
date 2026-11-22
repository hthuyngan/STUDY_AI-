import type { LucideIcon } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'

export interface SidebarItemProps {
  to: string
  label: string
  icon: LucideIcon
  count?: number
  onClick?: () => void
}

export function SidebarItem({
  to,
  label,
  icon: Icon,
  count,
  onClick,
}: SidebarItemProps) {
  const location = useLocation()
  const [toPath, toQuery] = to.split('?')
  const isActive = toQuery
    ? location.pathname === toPath && location.search.includes(toQuery)
    : location.pathname === toPath && !location.search.includes('mode=')

  return (
    <Link
      to={to}
      onClick={onClick}
      className={`sidebar-nav-link ${isActive ? 'active' : ''}`.trim()}
      aria-current={isActive ? 'page' : undefined}
    >
      <Icon className="sidebar-nav-icon" size={18} aria-hidden />
      <span className="sidebar-nav-label">{label}</span>
      {count !== undefined && count > 0 && (
        <span className="sidebar-nav-count" aria-hidden="true">
          {count > 99 ? '99+' : count}
        </span>
      )}
    </Link>
  )
}
