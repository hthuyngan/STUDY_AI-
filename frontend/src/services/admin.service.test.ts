import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { adminService } from './admin.service'
import * as authSession from '@/auth/authSession'
import { apiClient } from '@/lib/apiClient'

describe('adminService V2 (Mock Engine & Persistence)', () => {
  beforeEach(() => {
    adminService._resetMockState()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('calculates metrics properly based on current users', async () => {
    const metrics = await adminService.getMetrics()
    expect(metrics.totalUsers).toBeGreaterThan(0)
    expect(metrics.activeLearners).toBeGreaterThan(0)
    expect(metrics.staffAccounts).toBeGreaterThan(0)
    expect(metrics.isPrototypeMode).toBe(true)
  })

  it('filters users by search query and role/status', async () => {
    const allUsers = await adminService.getUsers()
    expect(allUsers.length).toBeGreaterThan(0)

    const searchMinh = await adminService.getUsers('Minh Anh')
    expect(searchMinh.length).toBeGreaterThan(0)
    expect(searchMinh.every((u) => u.displayName.includes('Minh Anh') || u.email.includes('Minh Anh'))).toBe(true)

    const teachersOnly = await adminService.getUsers('', 'teacher')
    expect(teachersOnly.every((u) => u.role === 'teacher')).toBe(true)

    const suspendedOnly = await adminService.getUsers('', 'all', 'suspended')
    expect(suspendedOnly.every((u) => u.status === 'suspended')).toBe(true)
  })

  it('creates a new demo user and persists it', async () => {
    const beforeCount = (await adminService.getUsers()).length

    const newUser = await adminService.createUser({
      displayName: 'Nguyễn Văn Test',
      email: 'nguyen.test@example.com',
      role: 'learner',
      status: 'active',
      className: '12A5',
    })

    expect(newUser.id).toBeDefined()
    expect(newUser.displayName).toBe('Nguyễn Văn Test')
    expect(newUser.className).toBe('12A5')

    const afterUsers = await adminService.getUsers()
    expect(afterUsers.length).toBe(beforeCount + 1)
    expect(afterUsers.find((u) => u.id === newUser.id)).toBeDefined()
  })

  it('updates user role and appends activity log', async () => {
    const users = await adminService.getUsers()
    const targetUser = users[0]

    const ok = await adminService.updateUserRole(targetUser.id, 'teacher')
    expect(ok).toBe(true)

    const updated = await adminService.getUserById(targetUser.id)
    expect(updated?.role).toBe('teacher')

    const activities = await adminService.getRecentActivities()
    expect(activities[0].target).toContain(targetUser.displayName)
  })

  it('toggles user status and revokes sessions', async () => {
    const users = await adminService.getUsers()
    const targetUser = users[0]
    const initialStatus = targetUser.status

    const ok = await adminService.toggleUserStatus(targetUser.id)
    expect(ok).toBe(true)

    const updated = await adminService.getUserById(targetUser.id)
    expect(updated?.status).not.toBe(initialStatus)

    const revokeOk = await adminService.revokeUserSessions(targetUser.id)
    expect(revokeOk).toBe(true)
  })

  it('performs bulk status, role, and delete operations', async () => {
    const users = await adminService.getUsers()
    const ids = [users[0].id, users[1].id]

    // Bulk status
    const statusRes = await adminService.bulkUpdateStatus(ids, 'suspended')
    expect(statusRes.updatedCount).toBe(2)

    const u0 = await adminService.getUserById(ids[0])
    const u1 = await adminService.getUserById(ids[1])
    expect(u0?.status).toBe('suspended')
    expect(u1?.status).toBe('suspended')

    // Bulk role
    const roleRes = await adminService.bulkUpdateRole(ids, 'content')
    expect(roleRes.updatedCount).toBe(2)
    expect((await adminService.getUserById(ids[0]))?.role).toBe('content')

    // Bulk delete
    const deleteRes = await adminService.bulkDeleteUsers(ids)
    expect(deleteRes.deletedCount).toBe(2)
    expect(await adminService.getUserById(ids[0])).toBeNull()
  })

  it('exports valid CSV data format', async () => {
    const users = await adminService.getUsers()
    const csv = adminService.exportUsersCSV(users)
    expect(csv).toContain('ID,Họ và tên,Email,Vai trò')
    expect(csv).toContain(users[0].displayName)
  })

  it('provides analytics trends and distributions', async () => {
    const analytics7d = await adminService.getAnalytics('7d')
    expect(analytics7d.trends.length).toBeGreaterThan(0)
    expect(analytics7d.roleDistribution.length).toBe(4)
    expect(analytics7d.statusDistribution.length).toBe(4)

    const analyticsMonth = await adminService.getAnalytics('month')
    expect(analyticsMonth.trends.length).toBeGreaterThan(0)
  })

  it('handles code-defined role permissions matrix immutably', async () => {
    const initialSim = await adminService.getRolePermissionsSimulation()
    expect(initialSim.admin.length).toBeGreaterThan(0)

    // Toggle is a no-op because RBAC is immutable and code-defined
    const updated = await adminService.toggleRolePermissionSimulation('learner', 'view_classes')
    expect(updated.learner).not.toContain('view_classes')

    // Reset returns authoritative matrix
    const reset = await adminService.resetRolePermissionsSimulation()
    expect(reset.learner).not.toContain('view_classes')
  })

  it('fails closed when authenticated and API rejects with 401/403/500', async () => {
    const authSession = await import('@/auth/authSession')
    const { apiClient } = await import('@/lib/apiClient')
    const { vi } = await import('vitest')

    const users = await adminService.getUsers()
    const target = users[0]
    const originalRole = target.role

    vi.spyOn(authSession, 'getAccessToken').mockReturnValue('mock-admin-token')
    vi.spyOn(apiClient, 'patch').mockRejectedValue(new Error('API 403 Forbidden'))

    await expect(adminService.updateUserRole(target.id, 'admin')).rejects.toThrow('API 403 Forbidden')

    vi.restoreAllMocks()

    // Verify local mock state was NOT mutated
    const checkUser = await adminService.getUserById(target.id)
    expect(checkUser?.role).toBe(originalRole)
  })

  it('toggles an API-loaded user without depending on the mock user array', async () => {
    vi.spyOn(authSession, 'getAccessToken').mockReturnValue('real-admin-token')
    vi.spyOn(apiClient, 'get').mockResolvedValue({
      id: 'db-user-not-in-mock-state',
      email: 'db-user@study.ai',
      displayName: 'Người dùng CSDL',
      role: 'learner',
      status: 'active',
      createdAt: '2026-11-21T00:00:00Z',
    })
    const patchSpy = vi.spyOn(apiClient, 'patch').mockResolvedValue(undefined)

    await expect(adminService.toggleUserStatus('db-user-not-in-mock-state')).resolves.toBe(true)
    expect(apiClient.get).toHaveBeenCalledWith('/api/v1/admin/users/db-user-not-in-mock-state')
    expect(patchSpy).toHaveBeenCalledWith('/api/v1/admin/users/db-user-not-in-mock-state/status', {
      status: 'suspended',
    })
  })

  it('reports a successful API deletion even when the user is absent from mock state', async () => {
    vi.spyOn(authSession, 'getAccessToken').mockReturnValue('real-admin-token')
    const deleteSpy = vi.spyOn(apiClient, 'delete').mockResolvedValue(undefined)

    await expect(adminService.deleteUser('db-user-not-in-mock-state')).resolves.toBe(true)
    expect(deleteSpy).toHaveBeenCalledWith('/api/v1/admin/users/db-user-not-in-mock-state')
  })
})
