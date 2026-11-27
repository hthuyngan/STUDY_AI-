import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { adminService } from './admin.service'
import { apiClient } from '@/lib/apiClient'

describe('adminService (API & Real Backend Architecture)', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('calculates metrics properly based on backend dashboard and health responses', async () => {
    vi.spyOn(apiClient, 'get').mockImplementation(async (url: string) => {
      if (url.startsWith('/api/v1/admin/dashboard')) {
        return {
          metrics: {
            totalUsers: 150,
            learnersCount: 120,
            staffAccounts: 30,
            completedLessonsTotal: 450,
            systemStatus: 'healthy',
          },
        }
      }
      if (url === '/api/v1/admin/system/health') {
        return {
          database: { status: 'connected', latencyMs: 12 },
          environment: 'production',
          backendVersion: '10.0.1',
        }
      }
      return null
    })

    const metrics = await adminService.getMetrics()
    expect(metrics.totalUsers).toBe(150)
    expect(metrics.activeLearners).toBe(120)
    expect(metrics.staffAccounts).toBe(30)
    expect(metrics.systemStatus).toBe('healthy')
    expect(metrics.databaseStatus).toBe('connected')
    expect(metrics.isPrototypeMode).toBe(false)
  })

  it('queries users with search, role, status and pagination parameters', async () => {
    const getSpy = vi.spyOn(apiClient, 'get').mockResolvedValue({
      items: [
        {
          id: 'usr-1',
          email: 'minh.anh@example.com',
          displayName: 'Nguyễn Minh Anh',
          role: 'learner',
          status: 'active',
          grade: '12',
          createdAt: '2026-01-01T00:00:00Z',
        },
      ],
      page: 1,
      pageSize: 50,
      total: 1,
      totalPages: 1,
    })

    const users = await adminService.getUsers('Minh Anh', 'learner', 'active', 1, 50)
    expect(users.length).toBe(1)
    expect(users[0].displayName).toBe('Nguyễn Minh Anh')
    expect(getSpy).toHaveBeenCalledWith(
      '/api/v1/admin/users?search=Minh+Anh&role=learner&status=active&page=1&pageSize=50'
    )
  })

  it('creates user via backend API POST /api/v1/admin/users', async () => {
    const postSpy = vi.spyOn(apiClient, 'post').mockResolvedValue({
      user: {
        id: 'usr-new-123',
        email: 'nguyen.test@example.com',
        displayName: 'Nguyễn Văn Test',
        role: 'learner',
        status: 'active',
        grade: '12A5',
        createdAt: '2026-11-21T00:00:00Z',
      },
    })

    const newUser = await adminService.createUser({
      displayName: 'Nguyễn Văn Test',
      email: 'nguyen.test@example.com',
      role: 'learner',
      status: 'active',
      className: '12A5',
      password: 'SecurePassword123!',
    })

    expect(newUser.id).toBe('usr-new-123')
    expect(newUser.displayName).toBe('Nguyễn Văn Test')
    expect(newUser.className).toBe('12A5')
    expect(postSpy).toHaveBeenCalledWith('/api/v1/admin/users', {
      email: 'nguyen.test@example.com',
      displayName: 'Nguyễn Văn Test',
      role: 'learner',
      status: 'active',
      grade: '12A5',
      password: 'SecurePassword123!',
    })
  })

  it('updates user role and status via backend API PATCH', async () => {
    const patchSpy = vi.spyOn(apiClient, 'patch').mockResolvedValue(undefined)

    const okRole = await adminService.updateUserRole('usr-1', 'teacher')
    expect(okRole).toBe(true)
    expect(patchSpy).toHaveBeenCalledWith('/api/v1/admin/users/usr-1/role', { role: 'teacher' })

    const okStatus = await adminService.updateUserStatus('usr-1', 'suspended')
    expect(okStatus).toBe(true)
    expect(patchSpy).toHaveBeenCalledWith('/api/v1/admin/users/usr-1/status', { status: 'suspended' })
  })

  it('toggles user status by inspecting current user from backend', async () => {
    vi.spyOn(apiClient, 'get').mockResolvedValue({
      id: 'usr-toggle',
      email: 'user@study.ai',
      displayName: 'User Toggle',
      role: 'learner',
      status: 'active',
      createdAt: '2026-11-21T00:00:00Z',
    })
    const patchSpy = vi.spyOn(apiClient, 'patch').mockResolvedValue(undefined)

    const ok = await adminService.toggleUserStatus('usr-toggle')
    expect(ok).toBe(true)
    expect(patchSpy).toHaveBeenCalledWith('/api/v1/admin/users/usr-toggle/status', {
      status: 'suspended',
    })
  })

  it('revokes user sessions via backend API POST', async () => {
    const postSpy = vi.spyOn(apiClient, 'post').mockResolvedValue(undefined)

    const ok = await adminService.revokeUserSessions('usr-1')
    expect(ok).toBe(true)
    expect(postSpy).toHaveBeenCalledWith('/api/v1/admin/users/usr-1/revoke-sessions')
  })

  it('resets user password via backend API POST', async () => {
    const postSpy = vi.spyOn(apiClient, 'post').mockResolvedValue({
      success: true,
      userId: 'usr-1',
      message: 'Đặt lại mật khẩu thành công.',
    })

    const res = await adminService.resetPassword('usr-1', 'NewPassword2026!')
    expect(res.success).toBe(true)
    expect(postSpy).toHaveBeenCalledWith('/api/v1/admin/users/usr-1/reset-password', {
      newPassword: 'NewPassword2026!',
    })
  })

  it('deletes user via backend API DELETE', async () => {
    const deleteSpy = vi.spyOn(apiClient, 'delete').mockResolvedValue(undefined)

    const ok = await adminService.deleteUser('usr-1')
    expect(ok).toBe(true)
    expect(deleteSpy).toHaveBeenCalledWith('/api/v1/admin/users/usr-1')
  })

  it('exports valid CSV data format', () => {
    const sampleUsers = [
      {
        id: 'usr-csv-1',
        displayName: 'Nguyễn Văn A',
        email: 'a@example.com',
        role: 'learner' as const,
        status: 'active' as const,
        className: '12A1',
        createdAt: '2026-01-01T00:00:00Z',
      },
    ]

    const csv = adminService.exportUsersCSV(sampleUsers)
    expect(csv).toContain('ID,Họ và tên,Email,Vai trò')
    expect(csv).toContain('Nguyễn Văn A')
    expect(csv).toContain('a@example.com')
  })

  it('fetches analytics from backend endpoint /api/v1/admin/analytics', async () => {
    const getSpy = vi.spyOn(apiClient, 'get').mockResolvedValue({
      trends: [{ date: '2026-11-20', activeUsers: 45, newSignups: 5, completions: 30 }],
      roleDistribution: [{ name: 'Học viên', count: 120, percentage: 80 }],
      statusDistribution: [{ name: 'Đang hoạt động', count: 110, percentage: 90 }],
    })

    const analytics = await adminService.getAnalytics('7d')
    expect(getSpy).toHaveBeenCalledWith('/api/v1/admin/analytics?range=7d')
    expect(analytics.trends.length).toBe(1)
    expect(analytics.roleDistribution.length).toBe(1)
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

  it('fails closed when backend API rejects with error', async () => {
    vi.spyOn(apiClient, 'patch').mockRejectedValue(new Error('API 403 Forbidden'))

    await expect(adminService.updateUserRole('usr-1', 'admin')).rejects.toThrow('API 403 Forbidden')
  })
})
