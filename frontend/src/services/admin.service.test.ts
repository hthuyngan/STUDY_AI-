import { describe, it, expect, beforeEach } from 'vitest'
import { adminService } from './admin.service'

describe('adminService V2 (Mock Engine & Persistence)', () => {
  beforeEach(() => {
    adminService._resetMockState()
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
    expect(analytics7d.roleDistribution.length).toBe(5)
    expect(analytics7d.statusDistribution.length).toBe(4)

    const analyticsMonth = await adminService.getAnalytics('month')
    expect(analyticsMonth.trends.length).toBeGreaterThan(0)
  })

  it('handles role permissions simulation sandbox', async () => {
    const initialSim = await adminService.getRolePermissionsSimulation()
    expect(initialSim.admin.length).toBeGreaterThan(0)

    // Toggle a permission
    const updated = await adminService.toggleRolePermissionSimulation('learner', 'view_classes')
    expect(updated.learner).toContain('view_classes')

    // Reset back
    const reset = await adminService.resetRolePermissionsSimulation()
    expect(reset.learner).not.toContain('view_classes')
  })
})
