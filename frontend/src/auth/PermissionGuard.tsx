import React from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from './useAuth'
import { hasPermission, hasAnyPermission } from './permissions'
import type { RolePermission } from './permissions'
import { UnauthorizedPage } from '@/pages/Error/UnauthorizedPage'

export interface PermissionGuardProps {
  permission: RolePermission | RolePermission[]
  children?: React.ReactNode
}

export const PermissionGuard: React.FC<PermissionGuardProps> = ({
  permission,
  children,
}) => {
  const { user, state, isGuest } = useAuth()
  const location = useLocation()

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

  const authorized = Array.isArray(permission)
    ? hasAnyPermission(user, permission)
    : hasPermission(user, permission)

  if (!authorized) {
    const permStr = Array.isArray(permission)
      ? permission.join(', ')
      : permission
    return <UnauthorizedPage requiredPermission={permStr} />
  }

  return children ? <>{children}</> : <Outlet />
}
