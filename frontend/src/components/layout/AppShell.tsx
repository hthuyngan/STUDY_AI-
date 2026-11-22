import { type ReactNode, useState } from 'react'
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
  const isLesson = location.pathname.includes('/lessons/')
  const [mobileOpen, setMobileOpen] = useState<boolean>(false)

  return (
    <div className="app-shell">
      {/* Sidebar */}
      <Sidebar
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />

      {/* Main viewport */}
      <div className="app-main">
        <Topbar onOpenMobileMenu={() => setMobileOpen(true)} />

        <main
          className={`app-content-container ${isAITutor ? 'app-content-ai-tutor' : ''} ${isLesson ? 'app-content-lesson' : ''}`.trim()}
        >
          <div
            className={`app-content-inner ${isAITutor ? 'app-content-inner-full' : ''} ${isLesson ? 'app-content-inner-lesson' : ''}`.trim()}
          >
            {children}
          </div>
        </main>

        {!isAITutor && <MobileBottomNav />}
      </div>
    </div>
  )
}
