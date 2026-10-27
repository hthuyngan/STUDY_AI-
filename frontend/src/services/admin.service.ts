import type {
  AdminActivityItem,
  AdminAttentionItem,
  AdminSystemMetrics,
  AdminUserItem,
} from '@/types/admin'
import {
  INITIAL_MOCK_ACTIVITIES,
  INITIAL_MOCK_ATTENTION_ITEMS,
  INITIAL_MOCK_METRICS,
  INITIAL_MOCK_USERS,
} from '@/data/staff/admin.mock'

// In-memory state for prototype interactions
let mockUsers = [...INITIAL_MOCK_USERS]
const mockAttentionItems = [...INITIAL_MOCK_ATTENTION_ITEMS]
const mockActivities = [...INITIAL_MOCK_ACTIVITIES]

export const adminService = {
  async getMetrics(): Promise<AdminSystemMetrics> {
    return {
      ...INITIAL_MOCK_METRICS,
      totalUsers: mockUsers.length,
      staffAccounts: mockUsers.filter((u) => u.role !== 'learner').length,
    }
  },

  async getAttentionItems(): Promise<AdminAttentionItem[]> {
    return [...mockAttentionItems]
  },

  async getRecentActivities(): Promise<AdminActivityItem[]> {
    return [...mockActivities]
  },

  async getUsers(
    search = '',
    roleFilter = 'all',
    statusFilter = 'all'
  ): Promise<AdminUserItem[]> {
    let result = [...mockUsers]
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      result = result.filter(
        (u) =>
          u.displayName.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q)
      )
    }
    if (roleFilter && roleFilter !== 'all') {
      result = result.filter((u) => u.role === roleFilter)
    }
    if (statusFilter && statusFilter !== 'all') {
      result = result.filter((u) => u.status === statusFilter)
    }
    return result
  },

  async getUserById(userId: string): Promise<AdminUserItem | null> {
    const user = mockUsers.find((u) => u.id === userId)
    return user ? { ...user } : null
  },

  async updateUserRole(userId: string, newRole: string): Promise<boolean> {
    const user = mockUsers.find((u) => u.id === userId)
    if (user) {
      user.role = newRole as AdminUserItem['role']
      mockActivities.unshift({
        id: `act-${Date.now()}`,
        actorName: 'Quản trị viên Hệ thống',
        action: 'cập nhật vai trò thành công cho',
        target: `${user.displayName} (${user.role})`,
        timestamp: new Date().toISOString(),
      })
      return true
    }
    return false
  },

  async toggleUserStatus(userId: string): Promise<boolean> {
    const user = mockUsers.find((u) => u.id === userId)
    if (user) {
      user.status = user.status === 'active' ? 'suspended' : 'active'
      mockActivities.unshift({
        id: `act-${Date.now()}`,
        actorName: 'Quản trị viên Hệ thống',
        action: user.status === 'active' ? 'kích hoạt lại tài khoản' : 'tạm khóa tài khoản',
        target: `${user.displayName}`,
        timestamp: new Date().toISOString(),
      })
      return true
    }
    return false
  },

  async revokeUserSessions(userId: string): Promise<boolean> {
    const user = mockUsers.find((u) => u.id === userId)
    if (user) {
      mockActivities.unshift({
        id: `act-${Date.now()}`,
        actorName: 'Quản trị viên Hệ thống',
        action: 'thu hồi tất cả phiên đăng nhập của',
        target: `${user.displayName}`,
        timestamp: new Date().toISOString(),
      })
      return true
    }
    return false
  },

  async getSystemHealth(): Promise<{
    apiStatus: string
    database: { status: string; latencyMs: number }
    environment: string
    backendVersion: string
    checkedAt: string
  }> {
    return {
      apiStatus: 'operational',
      database: { status: 'connected', latencyMs: 2 },
      environment: 'development / prototype',
      backendVersion: 'v1.4.0 (Mock Engine)',
      checkedAt: new Date().toISOString(),
    }
  },

  // Reset helper for testing
  _resetMockState(): void {
    mockUsers = [...INITIAL_MOCK_USERS]
  },
}
