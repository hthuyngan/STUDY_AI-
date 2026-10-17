import { useEffect, useState } from 'react'
import { Bell, Moon, Settings, Sun } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Avatar } from '@/components/ui/Avatar'
import { IconButton } from '@/components/ui/IconButton'

interface DashboardTopHeaderProps {
  userName: string
  avatarUrl?: string
  greetingLabel?: string
}

export function DashboardTopHeader({
  userName,
  avatarUrl,
  greetingLabel = 'Chào buổi sáng',
}: DashboardTopHeaderProps) {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (document.documentElement.getAttribute('data-theme') as 'light' | 'dark') || 'light'
  })

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('study_ai_theme', theme)
  }, [theme])

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'))
  }

  return (
    <header className="learning-top-header" role="banner">
      <div className="learning-header-user">
        <Avatar
          src={avatarUrl}
          alt={userName}
          size="lg"
          className="learning-user-avatar"
        />
        <div className="learning-user-text">
          <span className="learning-greeting-label">{greetingLabel}</span>
          <h1 className="learning-user-name">
            {userName} <span className="greeting-wave" aria-hidden>👋</span>
          </h1>
        </div>
      </div>

      <div className="learning-header-actions" role="toolbar" aria-label="Tùy chọn cá nhân">
        <IconButton
          icon={theme === 'dark' ? Sun : Moon}
          label={theme === 'dark' ? 'Chuyển sang giao diện sáng' : 'Chuyển sang giao diện tối'}
          onClick={toggleTheme}
          variant="outline"
          size="sm"
        />

        <IconButton
          icon={Bell}
          label="Thông báo"
          badgeCount={2}
          variant="outline"
          size="sm"
        />

        <Link to="/settings" aria-label="Cài đặt">
          <IconButton
            icon={Settings}
            label="Cài đặt tài khoản"
            variant="outline"
            size="sm"
          />
        </Link>
      </div>
    </header>
  )
}
