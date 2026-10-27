import React from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from './useAuth'
import { hasRole } from './permissions'
import type { UserRole } from './auth.types'
import { UnauthorizedPage } from '@/pages/Error/UnauthorizedPage'
import { isStaffUiPreviewEnabled } from '@/config/staffPreview'

export interface RoleGuardProps {
  allowedRoles: UserRole | UserRole[]
  children?: React.ReactNode
}

export const RoleGuard: React.FC<RoleGuardProps> = ({
  allowedRoles,
  children,
}) => {
  const { user, state, isGuest } = useAuth()
  const location = useLocation()

  // Development / UI Review Preview Mode:
  // When preview mode is enabled, allows direct rendering of staff screens
  // without requiring authenticated backend session or role match.
  if (isStaffUiPreviewEnabled()) {
    return children ? <>{children}</> : <Outlet />
  }

  if (state === 'initializing') {
    return (
      <div
        className="auth-guard-loading"
        aria-busy="true"
        style={{
          minHeight: '200px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--text-muted, #627d98)',
        }}
      >
        <span>Đang kiểm tra quyền truy cập...</span>
      </div>
    )
  }

  if (isGuest || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (!hasRole(user, allowedRoles)) {
    const rolesStr = Array.isArray(allowedRoles)
      ? allowedRoles.join(', ')
      : allowedRoles
    return <UnauthorizedPage requiredRole={rolesStr} />
  }

  return children ? <>{children}</> : <Outlet />
}
