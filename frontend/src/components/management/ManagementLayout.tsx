import React from 'react'
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

  return (
    <div className="mgmt-layout">
      <ManagementSidebar config={config} />
      <div className="mgmt-main">
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
