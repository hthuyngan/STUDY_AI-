import { type ReactNode, useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { MobileBottomNav } from './MobileBottomNav'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'

export interface AppShellProps {
  children: ReactNode
}

export function AppShell({ children }: AppShellProps) {
  const location = useLocation()
  const isAITutor = location.pathname.startsWith('/ai-tutor')
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    return localStorage.getItem('study_ai_sidebar_collapsed') === 'true'
  })
  const [mobileOpen, setMobileOpen] = useState<boolean>(false)

  const toggleCollapse = () => {
    setCollapsed((prev) => {
      const next = !prev
      localStorage.setItem('study_ai_sidebar_collapsed', String(next))
      return next
    })
  }

  // Keyboard shortcut Ctrl+B or Cmd+B to toggle sidebar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault()
        toggleCollapse()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <div className="app-shell">
      {/* Sidebar */}
      <Sidebar
        collapsed={collapsed}
        onToggleCollapse={toggleCollapse}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />

      {/* Main viewport */}
      <div className={`app-main ${collapsed ? 'sidebar-collapsed' : ''}`}>
        <Topbar onOpenMobileMenu={() => setMobileOpen(true)} />

        <main className={`app-content-container ${isAITutor ? 'app-content-ai-tutor' : ''}`.trim()}>
          <div className={`app-content-inner ${isAITutor ? 'app-content-inner-full' : ''}`.trim()}>{children}</div>
        </main>

        {!isAITutor && <MobileBottomNav />}
      </div>
    </div>
  )
}
