import type { AuthUser, UserRole } from './auth.types'

export type RolePermission =
  | 'manage_users'
  | 'manage_roles'
  | 'view_system_metrics'
  | 'view_classes'
  | 'manage_assignments'
  | 'view_student_progress'
  | 'manage_content'
  | 'review_content'
  | 'publish_content'
  | 'manage_support_tickets'
  | 'view_user_support_profile'

export const ROLE_PERMISSIONS: Record<UserRole, RolePermission[]> = {
  learner: [],
  teacher: [
    'view_classes',
    'manage_assignments',
    'view_student_progress',
  ],
  content: [
    'manage_content',
    'review_content',
    'publish_content',
  ],
  support: [
    'manage_support_tickets',
    'view_user_support_profile',
  ],
  admin: [
    'manage_users',
    'manage_roles',
    'view_system_metrics',
    'view_classes',
    'manage_assignments',
    'view_student_progress',
    'manage_content',
    'review_content',
    'publish_content',
    'manage_support_tickets',
    'view_user_support_profile',
  ],
}

function extractRole(target: AuthUser | UserRole | null | undefined): UserRole | undefined {
  if (!target) return undefined
  if (typeof target === 'string') return target
  return target.role
}

export function hasPermission(
  target: AuthUser | UserRole | null | undefined,
  permission: RolePermission
): boolean {
  const role = extractRole(target)
  if (!role) return false
  const perms = ROLE_PERMISSIONS[role] || []
  return perms.includes(permission)
}

export function hasAnyPermission(
  target: AuthUser | UserRole | null | undefined,
  permissions: RolePermission[]
): boolean {
  const role = extractRole(target)
  if (!role) return false
  const perms = ROLE_PERMISSIONS[role] || []
  return permissions.some((p) => perms.includes(p))
}

export function hasRole(
  target: AuthUser | UserRole | null | undefined,
  role: UserRole | UserRole[]
): boolean {
  const userRole = extractRole(target)
  if (!userRole) return false
  if (Array.isArray(role)) {
    return role.includes(userRole)
  }
  return userRole === role
}

export function getDefaultRouteForRole(role?: UserRole): string {
  switch (role) {
    case 'admin':
      return '/admin'
    case 'teacher':
      return '/teacher'
    case 'content':
      return '/content'
    case 'support':
      return '/support'
    case 'learner':
    default:
      return '/dashboard'
  }
}

export function resolveHomeRoute(user: AuthUser | null | undefined): string {
  return getDefaultRouteForRole(user?.role)
}
