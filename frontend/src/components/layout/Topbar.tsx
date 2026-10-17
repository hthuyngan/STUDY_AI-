import { useEffect, useState } from 'react'
import { Bell, Menu, Moon, Search, Sun } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { IconButton } from '@/components/ui/IconButton'

export interface TopbarProps {
  onOpenMobileMenu?: () => void
}

export function Topbar({ onOpenMobileMenu }: TopbarProps) {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('study_ai_theme') as 'light' | 'dark') || 'light'
  })

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('study_ai_theme', theme)
  }, [theme])

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'))
  }

  return (
    <header className="topbar">
      {/* Left: Mobile hamburger & breadcrumb or title */}
      <div className="topbar-left">
        {onOpenMobileMenu && (
          <button
            type="button"
            className="topbar-mobile-btn mobile-only"
            onClick={onOpenMobileMenu}
            aria-label="Mở danh mục menu"
          >
            <Menu size={20} />
          </button>
        )}

        <div className="topbar-search desktop-only">
          <Search size={16} className="topbar-search-icon" aria-hidden />
          <input
            type="search"
            className="topbar-search-input"
            placeholder="Tìm kiếm bài học, môn học, dạng bài..."
            aria-label="Tìm kiếm nội dung"
          />
          <kbd className="topbar-search-kbd">⌘K</kbd>
        </div>
      </div>

      {/* Right: Actions */}
      <div className="topbar-right">
        {/* Theme toggle */}
        <IconButton
          icon={theme === 'light' ? Moon : Sun}
          label={theme === 'light' ? 'Chuyển sang nền tối' : 'Chuyển sang nền sáng'}
          onClick={toggleTheme}
        />

        {/* Notifications */}
        <IconButton
          icon={Bell}
          label="Thông báo học tập"
          badgeCount={2}
          onClick={() => {}}
        />

        {/* User avatar item */}
        <div className="topbar-user">
          <Avatar
            src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80"
            alt="Hoàng Thúy Ngân"
            size="sm"
          />
        </div>
      </div>
    </header>
  )
}
