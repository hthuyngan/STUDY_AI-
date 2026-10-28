import type {
  AccountStatus,
  AdminActivityItem,
  AdminAttentionItem,
  AdminSystemMetrics,
  AdminUserItem,
  AnalyticsTrendPoint,
  CreateDemoUserInput,
  TimeRangeFilter,
  UserDistributionItem,
} from '@/types/admin'
import type { RolePermission } from '@/auth/permissions'
import { ROLE_PERMISSIONS } from '@/auth/permissions'
import type { UserRole } from '@/auth/auth.types'
import {
  INITIAL_MOCK_ACTIVITIES,
  INITIAL_MOCK_ATTENTION_ITEMS,
  INITIAL_MOCK_METRICS,
  INITIAL_MOCK_USERS,
  MOCK_TRENDS_7D,
  MOCK_TRENDS_30D,
  MOCK_TRENDS_MONTH,
} from '@/data/staff/admin.mock'

const STORAGE_KEY_USERS = 'study_ai_admin_users_v2'
const STORAGE_KEY_ACTIVITIES = 'study_ai_admin_activities_v2'
const STORAGE_KEY_ATTENTION = 'study_ai_admin_attention_v2'
const STORAGE_KEY_ROLE_SIM = 'study_ai_admin_role_sim_v2'

function safeGetStorage<T>(key: string, fallback: T): T {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return fallback
    const raw = window.localStorage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

function safeSetStorage<T>(key: string, value: T): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(key, JSON.stringify(value))
    }
  } catch {
    // Ignore storage quota or disabled errors
  }
}

// In-memory state synchronized with localStorage
let mockUsers: AdminUserItem[] = safeGetStorage<AdminUserItem[]>(STORAGE_KEY_USERS, [...INITIAL_MOCK_USERS])
let mockActivities: AdminActivityItem[] = safeGetStorage<AdminActivityItem[]>(STORAGE_KEY_ACTIVITIES, [...INITIAL_MOCK_ACTIVITIES])
let mockAttentionItems: AdminAttentionItem[] = safeGetStorage<AdminAttentionItem[]>(STORAGE_KEY_ATTENTION, [...INITIAL_MOCK_ATTENTION_ITEMS])
let mockRoleSim: Record<UserRole, RolePermission[]> = safeGetStorage<Record<UserRole, RolePermission[]>>(
  STORAGE_KEY_ROLE_SIM,
  JSON.parse(JSON.stringify(ROLE_PERMISSIONS))
)

function persistAll() {
  safeSetStorage(STORAGE_KEY_USERS, mockUsers)
  safeSetStorage(STORAGE_KEY_ACTIVITIES, mockActivities)
  safeSetStorage(STORAGE_KEY_ATTENTION, mockAttentionItems)
  safeSetStorage(STORAGE_KEY_ROLE_SIM, mockRoleSim)
}

export const adminService = {
  async getMetrics(): Promise<AdminSystemMetrics> {
    const totalUsers = mockUsers.length
    const activeLearners = mockUsers.filter((u) => u.role === 'learner' && u.status === 'active').length
    const staffAccounts = mockUsers.filter((u) => u.role !== 'learner').length
    const completedLessonsTotal = mockUsers.reduce(
      (sum, u) => sum + (u.totalCompletedLessons || 0),
      INITIAL_MOCK_METRICS.completedLessonsTotal || 8642
    )

    return {
      ...INITIAL_MOCK_METRICS,
      totalUsers,
      activeLearners,
      staffAccounts,
      completedLessonsTotal,
      isPrototypeMode: true,
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
          u.email.toLowerCase().includes(q) ||
          (u.className && u.className.toLowerCase().includes(q))
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
    return user ? JSON.parse(JSON.stringify(user)) : null
  },

  async createUser(input: CreateDemoUserInput): Promise<AdminUserItem> {
    const newId = `usr-${Date.now().toString().slice(-4)}`
    const isLearner = input.role === 'learner'

    const newUser: AdminUserItem = {
      id: newId,
      email: input.email.trim(),
      displayName: input.displayName.trim(),
      role: input.role,
      status: input.status,
      className: input.className?.trim() || (isLearner ? 'Khối 12' : undefined),
      createdAt: new Date().toISOString(),
      lastLoginAt: undefined,
      totalCompletedLessons: isLearner ? 0 : undefined,
      averageScore: isLearner ? 0 : undefined,
      learningProgress: isLearner
        ? {
            completedLessons: 0,
            totalLessons: 32,
            streakDays: 0,
            recentSubjects: [
              { name: 'Toán học 12', progress: 0, lastStudied: new Date().toISOString() },
            ],
          }
        : undefined,
      assessments: [],
      activities: [
        {
          id: `uact-${Date.now()}`,
          action: 'Tài khoản được tạo thủ công bởi Quản trị viên',
          timestamp: new Date().toISOString(),
        },
      ],
    }

    mockUsers.unshift(newUser)

    mockActivities.unshift({
      id: `act-${Date.now()}`,
      actorName: 'Quản trị viên Hệ thống',
      action: 'thêm tài khoản mới',
      target: `${newUser.displayName} (${newUser.role})`,
      timestamp: new Date().toISOString(),
    })

    persistAll()
    return newUser
  },

  async updateUserRole(userId: string, newRole: string): Promise<boolean> {
    const user = mockUsers.find((u) => u.id === userId)
    if (user) {
      const oldRole = user.role
      user.role = newRole as UserRole

      if (!user.activities) user.activities = []
      user.activities.unshift({
        id: `uact-${Date.now()}`,
        action: `Vai trò được cập nhật từ ${oldRole} sang ${newRole}`,
        timestamp: new Date().toISOString(),
      })

      mockActivities.unshift({
        id: `act-${Date.now()}`,
        actorName: 'Quản trị viên Hệ thống',
        action: 'cập nhật vai trò thành công cho',
        target: `${user.displayName} (${user.role})`,
        timestamp: new Date().toISOString(),
      })
      persistAll()
      return true
    }
    return false
  },

  async toggleUserStatus(userId: string): Promise<boolean> {
    const user = mockUsers.find((u) => u.id === userId)
    if (user) {
      user.status = user.status === 'active' ? 'suspended' : 'active'

      if (!user.activities) user.activities = []
      user.activities.unshift({
        id: `uact-${Date.now()}`,
        action: user.status === 'active' ? 'Tài khoản được mở khóa' : 'Tài khoản bị tạm khóa',
        timestamp: new Date().toISOString(),
      })

      mockActivities.unshift({
        id: `act-${Date.now()}`,
        actorName: 'Quản trị viên Hệ thống',
        action: user.status === 'active' ? 'kích hoạt lại tài khoản' : 'tạm khóa tài khoản',
        target: `${user.displayName}`,
        timestamp: new Date().toISOString(),
      })
      persistAll()
      return true
    }
    return false
  },

  async revokeUserSessions(userId: string): Promise<boolean> {
    const user = mockUsers.find((u) => u.id === userId)
    if (user) {
      if (!user.activities) user.activities = []
      user.activities.unshift({
        id: `uact-${Date.now()}`,
        action: 'Mô phỏng: Thu hồi toàn bộ phiên đăng nhập của tài khoản',
        timestamp: new Date().toISOString(),
      })

      mockActivities.unshift({
        id: `act-${Date.now()}`,
        actorName: 'Quản trị viên Hệ thống',
        action: 'thu hồi phiên đăng nhập của',
        target: `${user.displayName}`,
        timestamp: new Date().toISOString(),
      })
      persistAll()
      return true
    }
    return false
  },

  async bulkUpdateStatus(userIds: string[], newStatus: AccountStatus): Promise<{ updatedCount: number }> {
    let count = 0
    mockUsers.forEach((u) => {
      if (userIds.includes(u.id)) {
        u.status = newStatus
        count++
      }
    })

    if (count > 0) {
      mockActivities.unshift({
        id: `act-${Date.now()}`,
        actorName: 'Quản trị viên Hệ thống',
        action: `thay đổi trạng thái hàng loạt (${newStatus}) cho`,
        target: `${count} tài khoản`,
        timestamp: new Date().toISOString(),
      })
      persistAll()
    }
    return { updatedCount: count }
  },

  async bulkUpdateRole(userIds: string[], newRole: UserRole): Promise<{ updatedCount: number }> {
    let count = 0
    mockUsers.forEach((u) => {
      if (userIds.includes(u.id)) {
        u.role = newRole
        count++
      }
    })

    if (count > 0) {
      mockActivities.unshift({
        id: `act-${Date.now()}`,
        actorName: 'Quản trị viên Hệ thống',
        action: `gán vai trò hàng loạt (${newRole}) cho`,
        target: `${count} tài khoản`,
        timestamp: new Date().toISOString(),
      })
      persistAll()
    }
    return { updatedCount: count }
  },

  async bulkDeleteUsers(userIds: string[]): Promise<{ deletedCount: number }> {
    const initialLen = mockUsers.length
    mockUsers = mockUsers.filter((u) => !userIds.includes(u.id))
    const deletedCount = initialLen - mockUsers.length

    if (deletedCount > 0) {
      mockActivities.unshift({
        id: `act-${Date.now()}`,
        actorName: 'Quản trị viên Hệ thống',
        action: 'xóa tài khoản demo hàng loạt',
        target: `${deletedCount} tài khoản`,
        timestamp: new Date().toISOString(),
      })
      persistAll()
    }
    return { deletedCount }
  },

  async getAnalytics(range: TimeRangeFilter = '7d'): Promise<{
    trends: AnalyticsTrendPoint[]
    roleDistribution: UserDistributionItem[]
    statusDistribution: UserDistributionItem[]
  }> {
    let trends = MOCK_TRENDS_7D
    if (range === '30d') trends = MOCK_TRENDS_30D
    else if (range === 'month' || range === 'all') trends = MOCK_TRENDS_MONTH

    const total = mockUsers.length || 1

    const roleCounts: Record<UserRole, number> = {
      learner: 0,
      teacher: 0,
      content: 0,
      support: 0,
      admin: 0,
    }
    const statusCounts: Record<AccountStatus, number> = {
      active: 0,
      suspended: 0,
      pending: 0,
      disabled: 0,
    }

    mockUsers.forEach((u) => {
      if (roleCounts[u.role] !== undefined) roleCounts[u.role]++
      if (statusCounts[u.status] !== undefined) statusCounts[u.status]++
    })

    const roleDistribution: UserDistributionItem[] = [
      { name: 'Học viên', key: 'learner', count: roleCounts.learner, percentage: Math.round((roleCounts.learner / total) * 100), color: '#102a43' },
      { name: 'Giáo viên', key: 'teacher', count: roleCounts.teacher, percentage: Math.round((roleCounts.teacher / total) * 100), color: '#3b82f6' },
      { name: 'Nội dung', key: 'content', count: roleCounts.content, percentage: Math.round((roleCounts.content / total) * 100), color: '#8b5cf6' },
      { name: 'Hỗ trợ', key: 'support', count: roleCounts.support, percentage: Math.round((roleCounts.support / total) * 100), color: '#047857' },
      { name: 'Quản trị', key: 'admin', count: roleCounts.admin, percentage: Math.round((roleCounts.admin / total) * 100), color: '#f59e0b' },
    ]

    const statusDistribution: UserDistributionItem[] = [
      { name: 'Đang hoạt động', key: 'active', count: statusCounts.active, percentage: Math.round((statusCounts.active / total) * 100), color: '#047857' },
      { name: 'Tạm khóa', key: 'suspended', count: statusCounts.suspended, percentage: Math.round((statusCounts.suspended / total) * 100), color: '#dc2626' },
      { name: 'Chờ duyệt', key: 'pending', count: statusCounts.pending, percentage: Math.round((statusCounts.pending / total) * 100), color: '#f59e0b' },
      { name: 'Vô hiệu', key: 'disabled', count: statusCounts.disabled, percentage: Math.round((statusCounts.disabled / total) * 100), color: '#64748b' },
    ]

    return { trends, roleDistribution, statusDistribution }
  },

  async getRolePermissionsSimulation(): Promise<Record<UserRole, RolePermission[]>> {
    return JSON.parse(JSON.stringify(mockRoleSim))
  },

  async toggleRolePermissionSimulation(role: UserRole, perm: RolePermission): Promise<Record<UserRole, RolePermission[]>> {
    const list = [...(mockRoleSim[role] || [])]
    const idx = list.indexOf(perm)
    if (idx >= 0) {
      list.splice(idx, 1)
    } else {
      list.push(perm)
    }
    mockRoleSim[role] = list
    safeSetStorage(STORAGE_KEY_ROLE_SIM, mockRoleSim)
    return JSON.parse(JSON.stringify(mockRoleSim))
  },

  async resetRolePermissionsSimulation(): Promise<Record<UserRole, RolePermission[]>> {
    mockRoleSim = JSON.parse(JSON.stringify(ROLE_PERMISSIONS))
    safeSetStorage(STORAGE_KEY_ROLE_SIM, mockRoleSim)
    return JSON.parse(JSON.stringify(mockRoleSim))
  },

  exportUsersCSV(users: AdminUserItem[]): string {
    const headers = ['ID', 'Họ và tên', 'Email', 'Vai trò', 'Trạng thái', 'Lớp/Đơn vị', 'Bài hoàn thành', 'Điểm trung bình', 'Ngày tạo']
    const rows = users.map((u) => [
      u.id,
      `"${u.displayName.replace(/"/g, '""')}"`,
      `"${u.email}"`,
      u.role,
      u.status,
      `"${u.className || ''}"`,
      u.totalCompletedLessons ?? '',
      u.averageScore ?? '',
      u.createdAt,
    ])
    return [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n')
  },

  downloadCSV(content: string, filename = 'study_ai_users_export.csv'): void {
    if (typeof window === 'undefined') return
    const blob = new Blob(['\uFEFF' + content], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', filename)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  },

  async getSystemHealth(): Promise<{
    apiStatus: string
    database: { status: string; latencyMs: number }
    environment: string
    backendVersion: string
    checkedAt: string
    prototypeMode: boolean
    storageStats: {
      usersCount: number
      activitiesCount: number
      attentionCount: number
      isLocalStoragePersisted: boolean
    }
  }> {
    const isPersisted = typeof window !== 'undefined' && !!window.localStorage?.getItem(STORAGE_KEY_USERS)
    return {
      apiStatus: 'Prototype Mock Engine (Mô phỏng cục bộ)',
      database: { status: 'In-Memory / LocalStorage', latencyMs: 0 },
      environment: 'development / prototype',
      backendVersion: 'v1.4.0 (Mock Engine — Chưa nối backend thật)',
      checkedAt: new Date().toISOString(),
      prototypeMode: true,
      storageStats: {
        usersCount: mockUsers.length,
        activitiesCount: mockActivities.length,
        attentionCount: mockAttentionItems.length,
        isLocalStoragePersisted: isPersisted,
      },
    }
  },

  // Reset helper for testing and reset demo button
  _resetMockState(): void {
    mockUsers = [...INITIAL_MOCK_USERS]
    mockActivities = [...INITIAL_MOCK_ACTIVITIES]
    mockAttentionItems = [...INITIAL_MOCK_ATTENTION_ITEMS]
    mockRoleSim = JSON.parse(JSON.stringify(ROLE_PERMISSIONS))
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(STORAGE_KEY_USERS)
        window.localStorage.removeItem(STORAGE_KEY_ACTIVITIES)
        window.localStorage.removeItem(STORAGE_KEY_ATTENTION)
        window.localStorage.removeItem(STORAGE_KEY_ROLE_SIM)
      }
    } catch {
      // Ignore
    }
  },
}
