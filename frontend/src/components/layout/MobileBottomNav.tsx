import { Bot, Layers, LayoutGrid, User } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'

export function MobileBottomNav() {
  const location = useLocation()

  const navItems = [
    { to: '/dashboard', label: 'Trang chủ', icon: LayoutGrid },
    { to: '/ai-tutor', label: 'AI', icon: Bot },
    { to: '/subjects', label: 'Môn học', icon: Layers },
    { to: '/profile', label: 'Tôi', icon: User },
  ]

  return (
    <nav className="mobile-bottom-nav" aria-label="Điều hướng nhanh di động">
      {navItems.map((item) => {
        const Icon = item.icon
        const isActive = location.pathname.startsWith(item.to)

        return (
          <Link
            key={item.to}
            to={item.to}
            className={`mobile-nav-item ${isActive ? 'active' : ''}`.trim()}
            aria-current={isActive ? 'page' : undefined}
          >
            <Icon size={20} className="mobile-nav-icon" aria-hidden />
            <span className="mobile-nav-label">{item.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
