import type { LucideIcon } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'

export interface SidebarItemProps {
  to: string
  label: string
  icon: LucideIcon
  count?: number
  collapsed?: boolean
  onClick?: () => void
}

export function SidebarItem({
  to,
  label,
  icon: Icon,
  count,
  collapsed = false,
  onClick,
}: SidebarItemProps) {
  const location = useLocation()
  const isActive = location.pathname === to

  return (
    <Link
      to={to}
      onClick={onClick}
      className={`sidebar-nav-link ${isActive ? 'active' : ''} ${collapsed ? 'collapsed' : ''}`.trim()}
      title={collapsed ? label : undefined}
      aria-current={isActive ? 'page' : undefined}
    >
      <Icon className="sidebar-nav-icon" size={18} aria-hidden />
      {!collapsed && <span className="sidebar-nav-label">{label}</span>}
      {!collapsed && count !== undefined && count > 0 && (
        <span className="sidebar-nav-count" aria-label={`${count} mục`}>
          {count > 99 ? '99+' : count}
        </span>
      )}
      {collapsed && count !== undefined && count > 0 && (
        <span className="sidebar-nav-dot" aria-hidden />
      )}
    </Link>
  )
}
