import React, { useState, useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import type { UserRole } from '@/auth/auth.types'
import { getWorkspaceConfig } from '@/components/layout/workspaceNavigation'
import { ManagementSidebar } from './ManagementSidebar'
import { ManagementHeader, BreadcrumbItem } from './ManagementHeader'
import './ManagementLayout.css'

export interface ManagementLayoutProps {
  role: Exclude<UserRole, 'learner'>
  title?: string
  breadcrumbs?: BreadcrumbItem[]
  headerActions?: React.ReactNode
  children?: React.ReactNode
}

export const ManagementLayout: React.FC<ManagementLayoutProps> = ({
  role,
  title,
  breadcrumbs,
  headerActions,
  children,
}) => {
  const config = getWorkspaceConfig(role)
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    return localStorage.getItem('study_ai_mgmt_sidebar_collapsed') === 'true'
  })

  const toggleCollapse = () => {
    setCollapsed((prev) => {
      const next = !prev
      localStorage.setItem('study_ai_mgmt_sidebar_collapsed', String(next))
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
    <div className="mgmt-layout">
      <ManagementSidebar
        config={config}
        collapsed={collapsed}
        onToggleCollapse={toggleCollapse}
      />
      <div className={`mgmt-main ${collapsed ? 'collapsed' : ''}`}>
        <ManagementHeader
          title={title || config.name}
          breadcrumbs={breadcrumbs}
          actions={headerActions}
        />
        <main className="mgmt-content-body">
          {children || <Outlet />}
        </main>
      </div>
    </div>
  )
}
