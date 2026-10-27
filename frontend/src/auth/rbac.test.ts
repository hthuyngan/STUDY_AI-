import { describe, it, expect } from 'vitest'
import {
  hasPermission,
  hasAnyPermission,
  hasRole,
  getDefaultRouteForRole,
  resolveHomeRoute,
  ROLE_PERMISSIONS,
} from './permissions'
import { getWorkspaceNavigation } from '@/components/layout/workspaceNavigation'
import type { UserRole } from './auth.types'

describe('RBAC Foundation & Permissions', () => {
  it('correctly maps default routes for all roles', () => {
    expect(getDefaultRouteForRole('learner')).toBe('/dashboard')
    expect(getDefaultRouteForRole('teacher')).toBe('/teacher')
    expect(getDefaultRouteForRole('content')).toBe('/content')
    expect(getDefaultRouteForRole('support')).toBe('/support')
    expect(getDefaultRouteForRole('admin')).toBe('/admin')
  })

  it('resolves home route based on user role', () => {
    expect(resolveHomeRoute(null)).toBe('/dashboard')
    expect(
      resolveHomeRoute({
        id: 'usr-1',
        email: 't@example.com',
        displayName: 'Teacher',
        role: 'teacher',
        createdAt: '2026-10-27T00:00:00Z',
      })
    ).toBe('/teacher')
    expect(
      resolveHomeRoute({
        id: 'usr-2',
        email: 'a@example.com',
        displayName: 'Admin',
        role: 'admin',
        createdAt: '2026-10-27T00:00:00Z',
      })
    ).toBe('/admin')
    expect(
      resolveHomeRoute({
        id: 'usr-3',
        email: 'l@example.com',
        displayName: 'Learner',
        role: 'learner',
        createdAt: '2026-10-27T00:00:00Z',
      })
    ).toBe('/dashboard')
  })

  it('enforces least-privilege role permissions', () => {
    // Learner has no staff permissions
    expect(ROLE_PERMISSIONS.learner).toEqual([])
    expect(hasPermission('learner', 'manage_users')).toBe(false)
    expect(hasPermission('learner', 'view_classes')).toBe(false)

    // Teacher has only teacher academic permissions
    expect(hasPermission('teacher', 'view_classes')).toBe(true)
    expect(hasPermission('teacher', 'manage_assignments')).toBe(true)
    expect(hasPermission('teacher', 'view_student_progress')).toBe(true)
    expect(hasPermission('teacher', 'manage_users')).toBe(false)
    expect(hasPermission('teacher', 'publish_content')).toBe(false)
    expect(hasPermission('teacher', 'manage_support_tickets')).toBe(false)

    // Content has editorial permissions
    expect(hasPermission('content', 'manage_content')).toBe(true)
    expect(hasPermission('content', 'review_content')).toBe(true)
    expect(hasPermission('content', 'publish_content')).toBe(true)
    expect(hasPermission('content', 'manage_users')).toBe(false)
    expect(hasPermission('content', 'manage_assignments')).toBe(false)

    // Support has ticket and user support profile permissions
    expect(hasPermission('support', 'manage_support_tickets')).toBe(true)
    expect(hasPermission('support', 'view_user_support_profile')).toBe(true)
    expect(hasPermission('support', 'manage_roles')).toBe(false)
    expect(hasPermission('support', 'publish_content')).toBe(false)

    // Admin has system and management permissions
    expect(hasPermission('admin', 'manage_users')).toBe(true)
    expect(hasPermission('admin', 'manage_roles')).toBe(true)
    expect(hasPermission('admin', 'view_system_metrics')).toBe(true)
    expect(hasPermission('admin', 'publish_content')).toBe(true)
  })

  it('verifies hasAnyPermission utility', () => {
    expect(hasAnyPermission('teacher', ['manage_users', 'view_classes'])).toBe(true)
    expect(hasAnyPermission('teacher', ['manage_users', 'manage_roles'])).toBe(false)
    expect(hasAnyPermission('support', ['manage_support_tickets'])).toBe(true)
    expect(hasAnyPermission('learner', ['manage_support_tickets', 'view_classes'])).toBe(false)
  })

  it('verifies hasRole utility', () => {
    expect(hasRole('teacher', ['teacher', 'admin'])).toBe(true)
    expect(hasRole('learner', ['teacher', 'admin'])).toBe(false)
    expect(hasRole('admin', ['teacher', 'admin'])).toBe(true)
  })

  it('generates isolated navigation per workspace without mixing learner curriculum', () => {
    const roles: UserRole[] = ['admin', 'teacher', 'content', 'support']

    for (const r of roles) {
      const nav = getWorkspaceNavigation(r)
      expect(nav.length).toBeGreaterThan(0)
      const allPaths = nav.flatMap((group) => group.items.map((i) => i.path))

      // No staff navigation includes learner specific curriculum or quiz paths
      expect(allPaths.some((p) => p === '/quiz' || p === '/learning-path')).toBe(false)
    }

    // Admin nav paths start with /admin
    const adminNav = getWorkspaceNavigation('admin')
    expect(adminNav[0].items[0].path).toBe('/admin')
    expect(adminNav.some((g) => g.items.some((i) => i.path === '/admin/users'))).toBe(true)

    // Teacher nav paths start with /teacher
    const teacherNav = getWorkspaceNavigation('teacher')
    expect(teacherNav[0].items[0].path).toBe('/teacher')
    expect(teacherNav.some((g) => g.items.some((i) => i.path === '/teacher/classes'))).toBe(true)

    // Content nav paths start with /content
    const contentNav = getWorkspaceNavigation('content')
    expect(contentNav[0].items[0].path).toBe('/content')
    expect(contentNav.some((g) => g.items.some((i) => i.path === '/content/subjects'))).toBe(true)

    // Support nav paths start with /support
    const supportNav = getWorkspaceNavigation('support')
    expect(supportNav[0].items[0].path).toBe('/support')
    expect(supportNav.some((g) => g.items.some((i) => i.path === '/support/tickets'))).toBe(true)
  })
})

