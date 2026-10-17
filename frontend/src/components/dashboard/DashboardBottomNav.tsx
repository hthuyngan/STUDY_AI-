import { Home, BookOpen, Sparkles, Trophy, Settings } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'

interface NavItem {
  id: string
  label: string
  path: string
  icon: typeof Home
}

const NAV_ITEMS: NavItem[] = [
  { id: 'home', label: 'Trang chủ', path: '/dashboard', icon: Home },
  { id: 'courses', label: 'Khóa học', path: '/courses', icon: BookOpen },
  { id: 'ai-tutor', label: 'AI Tutor', path: '/ai-tutor', icon: Sparkles },
  { id: 'achievements', label: 'Thành tích', path: '/achievements', icon: Trophy },
  { id: 'settings', label: 'Cài đặt', path: '/settings', icon: Settings },
]

export function DashboardBottomNav() {
  const location = useLocation()
  const currentPath = location.pathname

  return (
    <nav className="learning-bottom-nav" aria-label="Điều hướng chính của ứng dụng">
      <div className="learning-bottom-nav-inner">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon
          const isActive = currentPath === item.path || (item.path !== '/dashboard' && currentPath.startsWith(item.path))
          const isAI = item.id === 'ai-tutor'

          return (
            <Link
              key={item.id}
              to={item.path}
              className={`learning-nav-link ${isActive ? 'is-active' : ''} ${isAI ? 'is-ai-link' : ''}`}
              aria-current={isActive ? 'page' : undefined}
            >
              <div className="nav-icon-container">
                <Icon size={20} className="nav-item-icon" aria-hidden />
              </div>
              <span className="nav-item-label">{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
